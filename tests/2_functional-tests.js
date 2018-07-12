/*
*
*
*             FILL IN EACH FUNCTIONAL TEST BELOW COMPLETELY
*             -----[Keep the tests in the same order!]-----
*             (if additional are added, keep them at the very end!)
*/

const chaiHttp = require('chai-http');
const chai = require('chai');
const assert = chai.assert;
const expect = chai.expect;

const server = require('../server');

chai.use(chaiHttp);

suite('Functional Tests', function() {

    suite('POST /api/issues/{project} => object with issue data', function() {

        function testDate (name, dateStr, startDate, finishDate) {
            const date = new Date(dateStr);
            assert.isNotNaN(date.valueOf(), 'invalid date: '+name);
            expect(date, 'date out of range: '+name)
                .to.be.within(startDate, finishDate);
        }

        function checkDates (resBody, startDate, finishDate) {
            testDate(
                'created_on',
                resBody.created_on,
                startDate,
                finishDate,
                );
            testDate(
                'updated_on',
                resBody.updated_on,
                startDate,
                finishDate,
                );
        }

        const testStatus200 = reqBody => (done) => {
            const resKeys = Object.keys(reqBody).concat([
                "created_on",
                "updated_on",
                "open",
                "_id",
            ]);

            chai.request(server)
                .post('/api/issues/test')
                .send(reqBody)
                .end(onEnd);

            const startDate = new Date();
            function onEnd (err, res) {
                const finishDate = new Date();

                assert.equal(res.status, 200, 'status code is not 200');

                const resBody = JSON.parse(res.text);
                assert.typeOf(resBody, 'object', 'bad JSON input');
                assert.hasAllDeepKeys(resBody, resKeys, 'bad response keys');
                assert.include(resBody, reqBody, 'some sent data not included');
                assert.isTrue(resBody.open, 'issue is not set to open');

                checkDates(resBody, startDate, finishDate);
                done();
            }
        }
        
        test('Every field filled in', testStatus200({
            issue_title: 'Title',
            issue_text: 'text',
            created_by: 'Functional Test - Every field filled in',
            assigned_to: 'Chai and Mocha',
            status_text: 'In QA',
        }));

        test('Required fields filled in', testStatus200({
            issue_title: 'Title',
            issue_text: 'text',
            created_by: 'Functional Test - Required fields filled in',
        }));
        
        test('Missing required fields', (done) => {
            const reqBody = {
                issue_title: 'Title',
                created_by: 'Functional Test - Missing required fields',
            }

            chai.request(server)
                .post('/api/issues/test')
                .send(reqBody)
                .end(onEnd);

            function onEnd (err, res) {

                assert.equal(res.status, 403, 'status code is not 403');
                assert.equal(
                    res.text,
                    'issue_title, issue_text and created_by are required',
                    );
                done();
            }
        }); 
    });


    suite('PUT /api/issues/{project} => text', function() {
        
        test('No body', function(done) {
            
        });
        
        test('One field to update', function(done) {
            
        });
        
        test('Multiple fields to update', function(done) {
            
        });
        
    });


    suite('GET /api/issues/{project} => Array of objects with issue data', function() {
        
        test('No filter', function(done) {
            chai.request(server)
            .get('/api/issues/test')
            .query({})
            .end(function(err, res){
                assert.equal(res.status, 200);
                assert.isArray(res.body);
                assert.property(res.body[0], 'issue_title');
                assert.property(res.body[0], 'issue_text');
                assert.property(res.body[0], 'created_on');
                assert.property(res.body[0], 'updated_on');
                assert.property(res.body[0], 'created_by');
                assert.property(res.body[0], 'assigned_to');
                assert.property(res.body[0], 'open');
                assert.property(res.body[0], 'status_text');
                assert.property(res.body[0], '_id');
                done();
            });
        });
        
        test('One filter', function(done) {
            
        });
        
        test('Multiple filters (test for multiple fields you know will be in the db for a return)', function(done) {
            
        });
        
    });


    suite('DELETE /api/issues/{project} => text', function() {
        
        test('No _id', function(done) {
            
        });
        
        test('Valid _id', function(done) {
            
        });
        
    });

});
