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
import fetch from 'node-fetch'
import { env } from 'process'
import { MongoClient } from 'mongodb'
import { v4 as UUIDv4 } from 'uuid'
import { PLACE_AUTOCOMPLETE, STATIC_MAPS } from './external'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import cookieParser from 'cookie-parser'

/**
 * Pull enviornment variables and set default
 * values for variables that are undefined
 */
const port = env.PORT ?? '8080'
const host = env.HOST ?? '127.0.0.1'
const dbHost = env.DB_HOST ?? 'mongodb+srv://localhost:8000'
const googleKey = env.GOOGLE_KEY ?? 'xxxx-xxxx'

/**
 * Initilize express server
 */
const app = express()

/**
 * Initilize database connections
 */
const mongo = MongoClient.connect(dbHost)
  .then((client) => client.db('hartford'))
  .then((client) => client.collection('claims'))

const loginCollection = MongoClient.connect(dbHost)
  .then((client) => client.db('hartford'))
  .then((client) => client.collection('login_credentials'))

/**
 * Initilize express middleware
 */
app.use(express.json())
app.use(cors())
app.use(cookieParser())

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
    .then(async (db) => await db.findOne({ _id: req.params.claimID }))
    .then(JSON.stringify)
    .then((x) => res.end(x))
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
    policyNumber: req.body.policy_number,
    category: req.body.category,
    description: req.body.description,
    firstName: req.body.first_name,
    lastName: req.body.last_name,
    address: req.body.address,
    dateSubmitted: new Date().toUTCString(),
    dateOccurred: req.body.date_occurred,
    status: 'Unprocessed',
    _id: UUIDv4()
  }

  const response = {
    status: 200,
    uuid: document._id
  }

  mongo
    .then(async (db) => await db.insertOne(document))
    .then(() => res.status(200))
    .then(() => res.end(JSON.stringify(response)))
})

app.get('/claims', (req, res) => {
  const query = {
    firstName: req.query.firstName ?? '',
    lastName: req.query.lastName ?? '',
    policyNumber: req.query.policyNumber ?? ''
  }

  if (
    query.firstName === '' ||
    query.lastName === '' ||
    query.policyNumber === ''
  ) {
    res.status(400).send('required params missing ')
  } else {
    mongo
      .then((db) => db.find(query))
      .then(async (db) => await db.toArray())
      .then((db) => JSON.stringify(db))
      .then((db) => res.end(db))
  }
})

/**
 * This endpoint is used to search through the database
 * for any claims that match the given params
 */
app.get('/insurer/claims', (req, res) => {
  const cookie = req.cookies.jwt
  jwt.verify(cookie, 'secret', (err: any, _decoded: any) => {
    if (err) {
      res.status(401).send('unauthenticated')
    } else {
      const query = {
        firstName: req.query.firstName ?? /.*/,
        lastName: req.query.lastName ?? /.*/,
        policyNumber: req.query.policyNumber ?? /.*/
      }

      mongo
        .then((db) => db.find(query))
        .then(async (db) => await db.toArray())
        .then((db) => JSON.stringify(db))
        .then((db) => res.end(db))
    }
  })
})

/**
 * This endpoint returns a static map associated with a claim to
 * be displayed on the "view claims" page.
 */
app.get('/claims/map/:claimID', (req, res) => {
  mongo
    .then(async (db) => await db.findOne({ _id: req.params.claimID }))
    .then(async (db) => await fetch(`${STATIC_MAPS}?center=${db.address}&zoom=15&size=400x250&key=${googleKey}`)
    )
    .then(async (db) => await db.buffer())
    .then((db) => res.end(db))
})

// this endpoint returns autocomplete siggestions for address input in submit claim page
app.get('/address/:input', (req, res) => {
  fetch(`${PLACE_AUTOCOMPLETE}?input=${req.params.input}&key=${googleKey}`)
    .then(async (response) => await response.json())
    .then((json) => res.json(json))
  console.log(
    `${PLACE_AUTOCOMPLETE}?input=${req.params.input}&key=${googleKey}`
  )
})

app.post('/login', (req, res) => {
  loginCollection
    .then(async (db) => await db.findOne({ userName: req.body.user_name }))
    .then((y) => {
      console.log(y)
      if (y == null) {
        res.status(400).send('no user found')
      } else {
        bcrypt.compare(req.body.password, y.password, (err, same) => {
          if (err) {
            throw err
          }
          if (same) {
            const token = jwt.sign(y._id, 'secret')
            res.cookie('jwt', token, {
              httpOnly: true,
              // one day
              maxAge: 1000 * 60 * 60 * 24
            })
            res.setHeader('access-control-expose-headers', 'Set-Cookie')
            res.send(token)
          } else {
            res.send("don't match")
          }
        })
      }
    })
})

app.post('/register', async (req, res) => {
  try {
    const hashedPassword = await bcrypt.hash(req.body.password, 10)
    const document = {
      _id: UUIDv4(),
      userName: req.body.user_name,
      password: hashedPassword,
      email: req.body.email
    }
    loginCollection
      .then(async (db) => await db.insertOne(document))
      .then(() => res.status(200).send())
  } catch {
    res.status(500).send()
  }
})

app.post('/logout', (_, res) => {
  res.cookie('jwt', '', { maxAge: 0 })
  res.send('logged out')
})

app.listen(parseInt(port), host)
