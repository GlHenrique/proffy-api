import { Request, Response } from 'express'
import db from '../database/connection'

async function index (req: Request, res: Response) {
  const [totalConnections] = await db('connections').count('* as total')

  console.log(totalConnections)

  return res.json({
    total: totalConnections.total
  })
}

async function create (req: Request, res: Response) {
  const { user_id } = req.body

  await db('connections').insert({
    user_id
  })

  return res.status(201).send()
}

export default { index, create }
