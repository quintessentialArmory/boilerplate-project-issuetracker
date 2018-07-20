/* global suite */         //analogous to describe
/* global test */          //analogous to it
/* global suiteSetup */    //analogous to before
/* global suiteTeardown */ //analogous to after
/* global setup */         //analogous to beforeEach
/* global teardown */      //analogous to afterEach

const chaiHttp = require('chai-http');
const chai = require('chai');
const assert = chai.assert;
const ObjectID = require('mongodb').ObjectID;

const server = require('../server');

chai.use(chaiHttp);

suite('Functional Tests', () => {

    // declare an _id variable for the PUT and DELETE tests
    let testId;
    // make a random name for testing
    let project_name = '';
    for (let i = 0; i < 20; i++) {
        const n = Math.floor(Math.random() * 25) + 97;
        project_name += String.fromCharCode(n);
    }

    suite('POST /api/issues/{project} => object with issue data', () => {

        test('Every field filled in', done => {
            const form = {
                issue_title: 'Title',
                issue_text: 'text',
                created_by: 'Functional Test - Every field filled in',
                assigned_to: 'Chai and Mocha',
                status_text: 'In QA',
            };
            chai
            .request(server)
            .post('/api/issues/'+project_name)
            .send(form)
            .end((err, res) => {
                let text;
                assert.equal(res.status, 200, 'http status should be 200');

                text = 'sent data should be in the response';
                assert.include(res.body, form, text);

                const created = Date.parse(res.body.created_on);
                assert.isNotNaN(created, 'created_on should be a valid Date');

                text = 'creation date should be recent';
                assert.approximately(created, Date.now(), 1000, text);

                assert.isTrue(res.body.open, 'issue should be set to \'open\'');

                // save this id for the PUT and DELETE tests
                testId = res.body._id;

                done();
            });
        });

        test('Required fields filled in', done => {
            const form = {
                issue_title: 'Title',
                issue_text: 'text',
                created_by: 'Functional Test - Required fields filled in',
            };
            chai
            .request(server)
            .post('/api/issues/'+project_name)
            .send(form)
            .end((err, res) => {
                let text;
                assert.equal(res.status, 200, 'http status should be 200');

                text = 'sent data should be in the response';
                assert.include(res.body, form, text);
                done();
            });
        });

        test('Missing required fields', done => {
            const form = {
                issue_title: 'Title',
                created_by: 'Functional Test - Missing required fields',
            };
            chai
            .request(server)
            .post('/api/issues/'+project_name)
            .send(form)
            .end((err, res) => {
                let text;
                assert.equal(res.status, 400, 'http status should be 400');

                text = 'response text is not correct';
                assert.equal(res.text, 'missing input data', text);
                done();
            });
        });

    });

    suite('PUT /api/issues/{project} => text', () => {

        test('No body', done => {
            chai
            .request(server)
            .put('/api/issues/'+project_name)
            .end((err, res) => {
                let text;
                assert.equal(res.status, 400, 'http status should be 400');

                text = 'response text is not correct';
                assert.equal(res.text, 'no updated field sent', text);
                done();
            });
        });

        test('One field to update', done => {
            chai
            .request(server)
            .put('/api/issues/'+project_name)
            .send({
                _id: testId,
                assigned_to: 'Quincy Larson',
             })
            .end((err, res) => {
                let text;
                assert.equal(res.status, 200, 'http status should be 200');

                text = 'response text is not correct';
                assert.equal(res.text, 'successfully updated', text);
                done();
            });
        });

        test('Multiple fields to update', done => {
            chai
            .request(server)
            .put('/api/issues/'+project_name)
            .send({
                _id: testId,
                issue_title: '404 learn.freeCodeCamp.org not found',
                issue_text: `lol jk this is just a test entry`,
             })
            .end((err, res) => {
                let text;
                assert.equal(res.status, 200, 'http status should be 200');

                text = 'response text is not correct';
                assert.equal(res.text, 'successfully updated', text);
                done();
            });
        });

    });

    suite('GET /api/issues/{project} => Array of objects with issue data', ()=>{

        //POST some more issues
        const testIssues = [
          {
            issue_title: 'Title1',
            issue_text: 'text1',
            created_by: 'user1',
            assigned_to: 'Chai and Mocha',
          },
          {
            issue_title: 'Title2',
            issue_text: 'text2',
            created_by: 'user2',
            assigned_to: 'Quincy Larson',
          },
          {
            issue_title: 'Title3',
            issue_text: 'text3',
            created_by: 'user2',
            assigned_to: 'Chai and Mocha',
          },
          {
            issue_title: 'Title4',
            issue_text: 'text4',
            created_by: 'user3',
            assigned_to: 'Quincy Larson',
          },
          {
            issue_title: 'Title5',
            issue_text: 'text5',
            created_by: 'user1',
            assigned_to: 'Quincy Larson',
          },
        ];
        suiteSetup(done => {
            Promise.all(testIssues.map(issue => {
                const promise = chai
                    .request(server)
                    .post('/api/issues/'+project_name)
                    .send(issue);
                return promise
            }))
            .then(() => done())
            .catch(reason => {
                const msg = 'Something happened while '
                    + 'posting the test issues:\n'
                    + reason;
                console.error(msg);
                done(null);
            });
        });

        const requiredFields = [ // in a response
            'issue_title',
            'issue_text',
            'created_by',
            'created_on',
            'open',
            '_id',
        ];
        const allowedFields = [ // same
            'issue_title',
            'issue_text',
            'created_by',
            'created_on',
            'open',
            '_id',
            'updated_on',
            'assigned_to',
            'status_text',
            'project_name',
        ];

        test('No filter', done => {
            chai
            .request(server)
            .get('/api/issues/'+project_name)
            .query({})
            .end((err, res) => {
                let text;
                assert.equal(res.status, 200, 'http status should be 200');
                assert.isArray(res.body, 'response body should be an Array');
                for (let issue of res.body) {

                    text = 'at least one result does not contain all the '
                        +'minimum required fields';
                    assert.containsAllKeys(issue, requiredFields, text);

                    assert.includeMembers(
                        allowedFields,
                        Object.keys(issue),
                        'at least one result contains an unexpected field',
                    );
                }
                done();
            });
        });

        test('One filter', done => {
            chai
            .request(server)
            .get('/api/issues/'+project_name)
            .query({assigned_to: 'Quincy Larson'})
            .end((err, res) => {
                let text;
                assert.equal(res.status, 200, 'http status should be 200');

                text = 'there should be 4 \'issues\' assigned to Quincy Larson '
                    +'related to the \'project\' called: '+project_name;
                assert.equal(res.body.length, 4, text);

                assert.isArray(res.body, 'response body should be an Array');
                for (let issue in res.body) {
                    assert.equal(res.body[0].assigned_to, 'Quincy Larson');
                }
                done();
            });
        });

        test('Multiple filters', done => {
            chai
            .request(server)
            .get('/api/issues/'+project_name)
            .query({assigned_to: 'Quincy Larson', created_by: 'user1'})
            .end((err, res) => {
                let text;
                assert.equal(res.status, 200, 'http status should be 200');

                text = 'there should just one result';
                assert.equal(res.body.length, 1, );

                assert.isArray(res.body, 'response body should be an Array');

                text = 'Quincy Larson', 'the \'issue\' should be assigned to '
                    +'Quincy Larson';
                assert.equal(res.body[0].assigned_to, text);

                text = 'the \'issue\' should have been created by \'user1\'';
                assert.equal(res.body[0].created_by, 'user1', text);
                done();
            });
        });

    });

    suite('DELETE /api/issues/{project} => text', () => {

        test('No _id', done => {
            chai
            .request(server)
            .delete(`/api/issues/${project_name}/`)
            .end((err, res) => {
                let text;
                assert.equal(res.status, 400, 'http status should be 400');

                text = 'response text is not correct';
                assert.equal(res.text, '_id error', text);
                done();
            });
        });

        test('Valid _id', done => {
            chai
            .request(server)
            .delete('/api/issues/'+project_name)
            .query({_id: testId})
            .end((err, res) => {
                let text;
                assert.equal(res.status, 200, 'http status should be 200');

                text = 'response text is not correct';
                assert.equal(res.text, 'deleted ' + testId, text);
                done();
            });
        });

    });

});