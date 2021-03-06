import { Request, Response } from 'express'
import db from '../database/connection'
import { Schedule } from './types'
import HoursToMinutes from '../utils/HoursToMinutes'

async function index (req: Request, res: Response) {
  const filters = req.query

  if (!filters.week_day || !filters.subject || !filters.time) {
    return res.status(400).json({
      error: 'Missing filters to search classes'
    })
  }
  const timeInMinutes = HoursToMinutes(filters.time as string)

  const classes = await db('classes')
    .whereExists(function () {
      this.select('class_schedule.*')
        .from('class_schedule')
        .whereRaw('`class_schedule`.`class_id` = `classes`.`id`')
        .whereRaw('`class_schedule`.`week_day` = ??', [Number(filters.week_day)])
        .whereRaw('`class_schedule`.`from` <= ??', [Number(timeInMinutes)])
        .whereRaw('`class_schedule`.`to` > ??', [Number(timeInMinutes)])
    })
    .where('classes.subject', '=', filters.subject as string)
    .join('users', 'classes.user_id', '=', 'users.id')
    .select(['classes.*', 'users.*'])

  return res.json(classes)
}

async function create (req: Request, res: Response) {
  const {
    name,
    avatar,
    whatsapp,
    bio,
    subject,
    cost,
    schedule
  } = req.body

  const trx = await db.transaction()

  try {
    const insertedUsersIds = await trx('users').insert({
      name,
      avatar,
      whatsapp,
      bio
    })

    const [user_id] = insertedUsersIds

    const insertedClassesIds = await trx('classes').insert({
      subject,
      cost,
      user_id
    })

    const [class_id] = insertedClassesIds

    const classSchedule = schedule.map((scheduleItem: Schedule) => {
      return {
        class_id,
        week_day: scheduleItem.week_day,
        from: HoursToMinutes(scheduleItem.from),
        to: HoursToMinutes(scheduleItem.to)
      }
    })

    await trx('class_schedule').insert(classSchedule)

    await trx.commit()

    return res.status(201).send()
  } catch (err) {
    await trx.rollback()
    return res.status(400).json({
      error: 'Unexpected error while creating new class'
    })
  }
}

export default { index, create }
