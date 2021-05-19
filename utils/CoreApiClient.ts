import { TelemetryClient } from './TelemetryClient'

const APPINSIGHTS_INSTRUMENTATIONKEY =
  process.env.APPINSIGHTS_INSTRUMENTATIONKEY || ''
const STYLECARD_API_URL = process.env.STYLECARD_API_URL || ''
const STYLECARD_API_KEY = process.env.STYLECARD_API_KEY || ''

//All numbers are cm, default to 3,3
export class CoreApiMeasurementsPayload {
  userId: string
  vscan: boolean
  predictDims: boolean
  bridge: boolean
  garmentType: string
  height: number
  preferences: [
    {
      chest: number[]
      waist: number[]
      hips: number[]
    }
  ]

  constructor() {
    // Default values for development
    this.vscan = true
    this.predictDims = true
    this.bridge = true
    this.garmentType = 'shirt'
    this.preferences = [
      {
        chest: [],
        waist: [],
        hips: [],
      },
    ]
    this.preferences[0].chest = [5, 5]
    this.preferences[0].waist = [5, 5]
    this.preferences[0].hips = [5, 5]
  }
}

export class CoreApiClient {
  correlationId: string
  telemetryClient: TelemetryClient

  constructor(correlationId?: string) {
    this.correlationId = correlationId ?? ''
    this.telemetryClient = new TelemetryClient(
      APPINSIGHTS_INSTRUMENTATIONKEY,
      this.correlationId
    )
  }

  apiFetch = async (
    url: string,
    requestInit?: RequestInit
  ): Promise<Response> => {
    const properties = {
      RequestUrl: url,
      RequestInit: JSON.stringify(requestInit),
    }

    this.telemetryClient.logTrace('CoreApiClient Request', properties)
    return fetch(url, requestInit)
  }

  postMeasurements = async (
    payload: CoreApiMeasurementsPayload
  ): Promise<Response> => {
    return this.apiFetch(`${STYLECARD_API_URL}/dev/invoke`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'Ocp-Apim-Subscription-Key': STYLECARD_API_KEY,
      },
      body: JSON.stringify(payload),
    })
  }
}
