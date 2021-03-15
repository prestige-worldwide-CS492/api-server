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
import { env } from 'process'

const app = express()
const port = env['PORT'] ?? '8080'
const host = env['HOST'] ?? '127.0.0.1'

app.get('/claims/:claimID', (_req, _res) => {

})

app.post('/claims', express.json(), (req, res) => {
  const policyNumber = req.body['policy_number']
  const address = req.body['address']
  const category = req.body['category']
  const description = req.body['description']
  const firstName = req.body['first_name']
  const lastName = req.body['last_name']

  // Success
  res.status(200)
  res.end(JSON.stringify({ status: 200, message: 'Ok' }))

  // ToDo: Invalid
  // res.status(400)
  // res.end(/* Some Error */)
})

app.listen(parseInt(port), host)
