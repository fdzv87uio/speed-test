import React, { useState } from 'react'
import Webcam from 'react-webcam'
import Image from 'next/image'
import { v4 as uuidv4 } from 'uuid'
import { CoreApiMeasurementsPayload } from '../../utils/CoreApiClient'
import Grid from '@material-ui/core/Grid'

export default function WebcamCapture(): JSX.Element {
  const webcamRef = React.useRef(null)
  const [userId] = useState<string>(uuidv4())
  const [frontImageUrl, setFrontImageUrl] = useState<string>()
  const [sideImageUrl, setSideImageUrl] = useState<string>()
  const [lastApiPayload, setLastApiPayload] = useState<string>()
  const [lastApiResult, setLastApiResult] = useState<string>()

  async function postImage(
    base64: string,
    userId: string,
    pose: string
  ): Promise<void> {
    const response = await fetch(`/api/user/${userId}/pose/${pose}`, {
      method: 'POST',
      body: JSON.stringify({ image: base64 }),
    })

    if (response.ok) {
      const result = await response.json()
      if (pose === 'front') setFrontImageUrl(result.url)
      else setSideImageUrl(result.url)
    } else {
      // eslint-disable-next-line no-console
      console.log(`error: ${response.status} ${response.statusText}`)
    }
  }

  async function callApi(userId: string): Promise<void> {
    const payload = new CoreApiMeasurementsPayload()
    payload.userId = userId
    payload.height = 172
    setLastApiPayload(JSON.stringify(payload, null, 2))
    const response = await fetch(`/api/user/${userId}/init`, {
      method: 'POST',
      body: JSON.stringify(payload),
    })

    if (response.ok) {
      const result = await response.json()
      setLastApiResult(JSON.stringify(result, null, 2))
      // eslint-disable-next-line no-console
      console.log(`result: ${JSON.stringify(result, null, 2)}`)
    } else {
      // eslint-disable-next-line no-console
      console.log(`error: ${response.status} ${response.statusText}`)
      const error = await response.text()
      setLastApiResult(
        `error: ${response.status} ${response.statusText} ${error}`
      )
    }
  }

  const height = 500
  const width = 300

  const videoConstraints = {
    // width: width,
    // height: height,
    facingMode: { exact: 'environment' },
  }

  const captureFront = React.useCallback(() => {
    const imgBase64 = webcamRef.current.getScreenshot()
    postImage(imgBase64, userId, 'front')
  }, [webcamRef, userId])

  const captureSide = React.useCallback(() => {
    const imgBase64 = webcamRef.current.getScreenshot()
    postImage(imgBase64, userId, 'side')
  }, [webcamRef, userId])

  const sendToApi = React.useCallback(() => {
    callApi(userId)
  }, [userId])

  return (
    <>
      <Webcam
        audio={false}
        height={height}
        ref={webcamRef}
        screenshotFormat="image/jpeg"
        width={width}
        videoConstraints={videoConstraints}
      />
      <Grid container>
        <Grid item xs={12}>
          <Grid container justify="center">
            <Grid item xs={6}>
              <div>
                {frontImageUrl ? (
                  <>
                    <Image src={frontImageUrl} width={150} height={200}></Image>
                    <p>{frontImageUrl}</p>
                  </>
                ) : null}
              </div>
              <button onClick={captureFront}>Front photo</button>
            </Grid>
            <Grid item xs={6}>
              <div>
                {sideImageUrl ? (
                  <>
                    <Image src={sideImageUrl} width={150} height={200}></Image>
                    <p>{sideImageUrl}</p>
                  </>
                ) : null}
              </div>
              <button onClick={captureSide}>Side photo</button>
            </Grid>
          </Grid>
        </Grid>

        <button onClick={sendToApi}>Call API</button>
        {lastApiResult ? <p>{lastApiResult}</p> : null}
        {lastApiPayload ? <p>{lastApiPayload}</p> : null}
      </Grid>
    </>
  )
}
