/**
 * Copyright 2021 Prestige Worldwide
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import express from 'express'
import cors from 'cors'
import { env } from 'process'
import { MongoClient } from 'mongodb'
import { v4 as UUIDv4 } from 'uuid'

const port = env['PORT'] ?? '8080'
const host = env['HOST'] ?? '127.0.0.1'
const dbHost = env['DB_HOST'] ?? 'mongodb://localhost'

const app = express()
const mongo = MongoClient.connect(dbHost)
  .then(client => client.db('hartford'))
  .then(client => client.collection('claims'))

app.use(express.json())
app.use(cors())

/**
 * This endpoint retrieves a document from the database by its UUID.
 * This endpoint expects a claim ID in the form of a UUIDv4.  It
 * returns the following response codes:
 * 200 - returns the requested document
 * 401 - the request did not provide the required authentication token
 * 403 - the provided token does not have the required permisssions for this record
 * 404 - the requested document does not exist
 */
app.get('/claims/:claimID', (req, res) => {
  
  mongo
    .then(db => db.findOne({ id: req.params['claimID'] }))
    .then(JSON.stringify)
    .then(res.end)
})

/**
 * This endpoint inserts a document into the database.  The form data
 * shoud be `application/json` and transmitted via POST request.
 * This endpoint returns the following response codes:
 * 200 - returns a UUIDv4 for this claim
 * 400 - the posted form data is invalid
 * 401 - the request did not provide the required authentication token
 * 403 - this token does not have the required permissions
 */
app.post('/claims', (req, res) => {
  const document = {
    policyNumber: req.body['policy_number'],
    category: req.body['category'],
    description: req.body['description'],
    firstName: req.body['first_name'],
    lastName: req.body['last_name'],
    uuid: UUIDv4(),
  }

  const response = {
    status: 200,
    uuid: document.uuid,
  }

  mongo
    .then(db => db.insertOne(document))
    .then(() => res.status(200))
    .then(() => res.end(JSON.stringify(response)))
})

app.listen(parseInt(port), host)
