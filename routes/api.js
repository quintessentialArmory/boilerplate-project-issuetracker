'use strict';

const expect = require('chai').expect;
const MongoClient = require('mongodb').MongoClient;
const ObjectID = require('mongodb').ObjectID;
const issue = require('./issue');
const IssueInsert = issue.Insert;
const IssueUpdate = issue.Update;
const IssueFilter = issue.Filter;

module.exports = async function (app, done) {
    const opts = { useNewUrlParser: true };
    const client = await MongoClient.connect(process.env.DB_URL, opts);
    const collection = client.db().collection(process.env.COLL_NAME);
    app
    .route('/api/issues/:project')
    .post(postHandler(collection))
    .put(putHandler(collection))
    .get(getHandler(collection))
    .delete(deleteHandler(collection));
    done();
};


// I can POST /api/issues/{projectname} with form data containing required
// issue_title, issue_text, created_by, and optional assigned_to and
// status_text.
// The object saved (and returned) will include all of those fields (blank for
// optional no input) and also include created_on(date/time), updated_on(date
// time), open(boolean, true for open, false for closed), and _id.
{
    const respond500 = res => {
        res.status(500).type('text').send('error while saving issue');
    }
    var postHandler = collection => async (req, res) => {
        const insert = new IssueInsert(req.body, req.params.project);
        if (insert.lacksRequired()) {
            res.status(400).type('text').send('missing input data');
            return
        }
        if (insert.isNotValid()) {
            res.status(400).type('text').send('invalid input data');
            return
        }
        insert
        .deleteEmptyStrings()
        .deleteUnexpected()
        .setDefaults();

        let result;
        try {
            result = await collection.insertOne(insert.doc);
        } catch (error) {
            console.error(error);
            respond500(res);
            return
        }
        if (result.insertedCount != 1) {
            respond500(res);
            return
        }
        res.json(insert.doc);
    }
}


// I can PUT /api/issues/{projectname} with a _id and any fields in the object
// with a value to object said object. Returned will be 'successfully updated'
// or 'could not update '+_id. This should always update updated_on. If no
// fields are sent return 'no updated field sent'.
{
    const respond500 = (res, _id) => {
        res.status(500).type('text').send('could not update '+_id);
    }
    const respond400 = (res, text) => res.status(400).type('text').send(text);

    var putHandler = collection => async (req, res) => {
        const _id = req.body._id;
        delete req.body._id;
        {
            let empty = true;
            for (let key in req.body) {
                empty = false;
                break;
            }
            if (empty) {
                respond400(res, 'no updated field sent');
                return
            }
        }
        if (!_id) {
            respond400(res, 'no _id sent');
            return
        }
        const filter = new IssueFilter({ _id }, req.params.project);
        if (filter.isNotValid()) {
            respond400(res, 'invalid query');
            return
        }
        filter.setValues();

        const update = new IssueUpdate(req.body);
        if (update.isNotValid()) {
            respond400(res, 'invalid input data');
            return
        }
        update
        .deleteUnexpected()
        .deleteEmptyStrings()
        .setValues();

        let result;
        try {
            result = await collection.updateOne(filter.doc, update.doc);
        } catch (error) {
            console.error(error);
            respond500(res, _id);
            return
        }
        if (result.modifiedCount != 1) {
            respond500(res, _id);
            return
        }
        res.type('text').send('successfully updated');
    }
}


// I can GET /api/issues/{projectname} for an array of all issues on that
// specific project with all the information for each issue as was returned
// when posted.
// I can filter my get request by also passing along any field and value in
// the query(ie. /api/issues/{project}?open=false). I can pass along as many
// fields/values as I want.

var getHandler = collection => async (req, res) => {
    const filter = new IssueFilter(req.query, req.params.project);
    if (filter.isNotValid()) {
        res.status(400).type('text').send('invalid query');
        return
    }
    filter
    .deleteEmptyStrings()
    .deleteUnexpected()
    .setValues();

    let results;
    try {
        results = await collection.find(filter.doc).toArray();
    } catch (error) {
        console.error(error);
        res.status(500).type('text').send('error fetching data');
        return
    }
    res.json(results);
}


// I can DELETE /api/issues/{projectname} with a _id to completely delete an
// issue. If no _id is sent return '_id error', success: 'deleted '+_id,
// failed: 'could not delete '+_id.
{
    const respond500 = (res, _id) => {
        res.status(500).send('could not delete ' + _id);
    }
    const respond400 = (res, text) => res.status(400).type('text').send(text);

    var deleteHandler = collection => async (req, res) => {
        let input;
        {
            let notEmpty = false;
            for (let key in req.query) {
                notEmpty = true;
                break;
            }
            if (notEmpty && typeof req.query._id !== 'undefined') {
                input = req.query;
            } else {
                notEmpty = false;
                for (let key in req.body) {
                    notEmpty = true;
                    break;
                }
                if (notEmpty && typeof req.body._id !== 'undefined') {
                    input = req.body;
                } else {
                    respond400(res, '_id error');
                    return
                }
            }
        }
        const filter = new IssueFilter(input, req.params.project);
        if (filter.isNotValid()) {
            res.status(400).type('text').send('invalid query');
            return
        }
        const _id = input._id
        filter
        .deleteEmptyStrings()
        .deleteUnexpected()
        .setValues();

        const updateDoc = {$set: {
            deleted: true,
            deteled_on: new Date(),
        }};
        let result;
        try {
            result = await collection.updateOne(filter.doc, updateDoc);
        } catch (error) {
            console.error(error);
            respond500(res, _id);
            return
        }
        if (result.modifiedCount != 1) {
            respond500(res, _id);
            return
        }
        res.type('text').send('deleted ' + _id);
    }
}
