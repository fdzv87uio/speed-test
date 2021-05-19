import { NextApiRequest, NextApiResponse } from 'next'
import {
  CoreApiClient,
  CoreApiMeasurementsPayload,
} from '../../../../../utils/CoreApiClient'

const handler = async (
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> => {
  const { id } = req.query

  if (!id) {
    res.status(400)
    return
  }

  if (req.method === 'POST') {
    if (!req.body) {
      res.status(400)
      return
    }

    const payload = JSON.parse(req.body) as CoreApiMeasurementsPayload
    payload.userId = id as string

    const coreApiClient = new CoreApiClient()
    const response = await coreApiClient.postMeasurements(payload)
    if (response.ok) {
      const result = await response.json()
      res.status(200).json(result)
      return
    } else {
      const result = await response.text()
      res.status(response.status).json(result)
    }
  } else {
    // Handle any other HTTP method
    res.status(400)
    return
  }
}

export default handler
