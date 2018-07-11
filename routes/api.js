/*
*
*
*             Complete the API routing below
*
*
*/

'use strict';

const expect = require('chai').expect;
const MongoClient = require('mongodb');
const ObjectId = require('mongodb').ObjectID;

module.exports = function (app) {

    MongoClient.connect(process.env.DB, function (error, connection) {
        const db = connection.db();
        app.route('/api/issues/:project')
            .get(getHandler(db))
            .post(postHandler(db))
            .put(putHandler(db))
            .delete(deleteHandler(db));
    });
};

// I can GET /api/issues/{projectname} for an array of all issues on that
// specific project with all the information for each issue as was returned
// when posted.
// I can filter my get request by also passing along any field and value in
// the query(ie. /api/issues/{project}?open=false). I can pass along as many
// fields/values as I want.
const getHandler = db => (req, res) => {
    const conds = {
        project_name: req.params.project,
        _id: req.query._id,
        issue_title: req.query.issue_title,
        issue_text: req.query.issue_text,
        created_by: req.query.created_by,
        assigned_to: req.query.assigned_to,
        status_text: req.query.status_text,
        created_on: req.query.created_on,
        updated_on: req.query.updated_on,
        open: req.query.open,
    };
    const opts = {
        projection: {'project_name': 0},
        sort: [['created_on': 1]],
    };

    let resultCount = req.query.limit;
    if (!resultCount || resultCount > 100) {
        resultCount = 100;
    }

    db.collection('issues')
        .find(conds, opts)
        .limit(resultCount)
        .toArray((error, list) => {
            if (error) {
                res.status(500).send('error fetching data');
                return
            }
            res.json(list);
        });
}

// I can POST /api/issues/{projectname} with form data containing required
// issue_title, issue_text, created_by, and optional assigned_to and
// status_text.
// The object saved (and returned) will include all of those fields (blank for
// optional no input) and also include created_on(date/time), updated_on(date
// time), open(boolean, true for open, false for closed), and _id.
const postHandler = db => (req, res) => {
    if (!req.body.issue_title ||
        !req.body.issue_text ||
        !req.body.created_by) {
        res.status(403).send('missing required input data'+
            ' (issue_title, issue_text or created_by)');
        return
    }
    const issue = {
        project_name: req.params.project,
        issue_title: req.body.issue_title,
        issue_text: req.body.issue_text,
        created_by: req.body.created_by,
        assigned_to: req.body.assigned_to,
        status_text: req.body.status_text,
        created_on: new Date(),
        updated_on: new Date(),
        open: true,
    };
    db.collection('issues').insertOne(issue, (error, doc) => {
        if (error) {
            console.log(error);
            res.status(500).send('error while saving issue');
            return
        }
        issue._id = doc._id;
        res.json(issue);
    });
}

// I can PUT /api/issues/{projectname} with a _id and any fields in the object
// with a value to object said object. Returned will be 'successfully updated'
// or 'could not update '+_id. This should always update updated_on. If no
// fields are sent return 'no updated field sent'.
const putHandler = db => (req, res) => {
    const _id = req.body._id;
    if (!_id) {
        res.status(403).send('missing _id');
        return
    }

    const update = {$set: {
        project_name: req.body.project_name,
        issue_title: req.body.issue_title,
        issue_text: req.body.issue_text,
        created_by: req.body.created_by,
        assigned_to: req.body.assigned_to,
        status_text: req.body.status_text,
        created_on: req.body.created_on,
        open: req.body.open,
    }};
    if (Object.keys(update.$set).length == 0) {
        res.status(403).send('no updated field sent');
        return
    }
    update.$set.updated_on = new Date();

    const conds = {
        _id: new ObjectID(_id),
        project_name: req.params.project,
    };

    db.collection('issues')
        .findOneAndUpdate(conds, update, (error, issue) => {
            if (error) {
                res.status(500).send('could not update ' + _id);
                return
            }
            res.send('successfully updated');
        });
}

// I can DELETE /api/issues/{projectname} with a _id to completely delete an
// issue. If no _id is sent return '_id error', success: 'deleted '+_id,
// failed: 'could not delete '+_id.
const deleteHandler = db => (req, res) => {
    const _id = req.body._id;
    if (!_id) {
        res.status(403).send('_id error');
        return
    }
    const conds = {
        _id: new ObjectID(_id),
        project_name: req.params.project,
    };
    db.collection('issues')
        .deleteOne(conds, (error, result) => {
            if (error || result.deletedCount == 0) {
                res.status(500).send('could not delete ' + _id);
                return
            }
            res.send('deleted ' + _id);
        });
}
