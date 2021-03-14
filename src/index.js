import express from 'express'

const port = 8080
const host = 'localhost'
const app = express()

app.get('/claims/:claimID', (req, res) => {
  res.end(`claimid: ${req.params.claimID}`)
})

app.listen(port, host)
