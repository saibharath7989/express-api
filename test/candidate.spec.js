const chai = require('chai')
const expect = chai.expect
const MongoMemoryServer = require('mongodb-memory-server').MongoMemoryServer
const mongod = new MongoMemoryServer({ debug: true })
const fs = require('fs')
const { promisify } = require('util')
const rimraf = require("rimraf")
const wtf = require('wtfnode')
const chalk = require('chalk')

let app = null
let request = null
let port = null
let dbName = null
let env = null
const MONGODB_SERVER = '127.0.0.1'
let candidate_id = null

before(async () => {
    uri = await mongod.getConnectionString({ useNewUrlParser: true })
    port = await mongod.getPort()
    dbPath = await mongod.getDbPath()
    dbName = await mongod.getDbName()
    instanceInfo = await mongod.getInstanceInfo()

    app = require('../server').app
    ctrl = require('../server').candidatesCtrl
    request = require('supertest')

    env = Object.assign({}, process.env)
    process.env.MONGODB_SERVER = MONGODB_SERVER
    process.env.MONGODB_SERVER_PORT = port
    process.env.MONGODB_DB = dbName
    process.env.MONGODB_DB_USER = ''
    process.env.MONGODB_DB_PASS = ''
    process.env.UPLOAD_FOLDER = 'test/uploaded_test_cv'
    process.env.FORCE_COLOR = 1
    const mkdir = promisify(fs.mkdir)
    if (!fs.existsSync(`./${process.env.UPLOAD_FOLDER}`)) {
        await mkdir(`./${process.env.UPLOAD_FOLDER}`)
    }
})

after((done) => {
    process.env = env

    rimraf('./test/uploaded_test_cv', () => {
        console.log(chalk.green.bold('Test folder deleted.'))
        if (mongod) {
            mongod.stop().then(() => {
                ctrl.connClose().then(() => {
                    //wtf.dump()    
                    console.log(chalk.green.bold('Database connection closed'))                
                    done()
                })
            })
        }
    })
})

describe('API TESTS', function () {

    describe('Seed Candidates DB', () => {
        it('add 1 candidate to DB', (done) => {
            request(app)
                .post('/api/candidates')
                .field('name', 'John Doe')
                .field('email', 'john_doe@gmail.com')
                .field('phone', '440789012458')
                .attach('cv', './test/TonyAbbot.pdf')
                .expect(200)
                .end((err, res) => {
                    expect(err).to.be.null
                    candidate_id = res.body._id
                    done();
                })
        })
    })

    describe('Candidates API tests', () => {
        it('expect GET /api/candidates returns list of candidates', (done) => {
            request(app)
                .get('/api/candidates')
                .expect(200)
                .end((err, res) => {
                    expect(err).to.be.null
                    expect(res.body.length).to.equal(1)
                    done()
                })
        })

        it('expect GET /api/candidates/:id return 400 with validation message', (done) => {
            request(app)
                .get('/api/candidates/5d7221107a4812a1ac9e223')
                .expect(400)
                .end((err, res) => {
                    expect(err).to.be.null
                    expect(res.error.message).to.equal('cannot GET /api/candidates/5d7221107a4812a1ac9e223 (400)')
                    done()
                })
        })

        it('expect GET /api/candidates/:id return 200 with object', (done) => {
            request(app)
                .get(`/api/candidates/${candidate_id}`)
                .expect(200)
                .end((err, res) => {
                    expect(err).to.be.null
                    expect(res.body._id).to.equal(candidate_id)
                    done()
                })
        })

        it('expect GET /api/candidates/:id return 200 with empty object', (done) => {
            request(app)
                .get('/api/candidates/5d7221107a4812a1ac9e2999')
                .expect(200)
                .end((err, res) => {
                    expect(err).to.be.null
                    expect(Object.keys(res.body).length).to.equal(0)
                    done()
                })
        })

        it('expect POST /api/candidates return 200 with created object', (done) => {
            request(app)
                .post('/api/candidates')
                .field('name', 'Jane Doe')
                .field('email', 'jane_doe@gmail.com')
                .field('phone', '440789012459')
                .attach('cv', './test/TonyAbbot.pdf')
                .expect(200)
                .end((err, res) => {
                    expect(err).to.be.null
                    expect(res.body._id).to.not.be.null
                    done()
                })
        })

        it('expect POST /api/candidates return 400 with validation error', (done) => {
            request(app)
                .post('/api/candidates')
                .field('name', 'Jane Doe')
                .field('phone', '440789012459')
                .attach('cv', './test/TonyAbbot.pdf')
                .expect(400)
                .end((err, res) => {
                    expect(err).to.be.null
                    expect(res.error.message).to.equal("cannot POST /api/candidates (400)")
                    done()
                })
        })

        it('expect DELETE /api/candidates/:id return 204', (done) => {
            request(app)
                .delete(`/api/candidates/${candidate_id}`)
                .expect(204)
                .end((err, res) => {
                    expect(err).to.be.null
                    done()
                })
        })

        it('expect DELETE /api/candidates/:id return 400', (done) => {
            request(app)
                .delete('/api/candidates/5d7221107a4812a1ac9e223')
                .expect(400)
                .end((err, res) => {
                    expect(err).to.be.null
                    expect(res.error.message).to.equal("cannot DELETE /api/candidates/5d7221107a4812a1ac9e223 (400)")
                    done()
                })
        })
    })
})
