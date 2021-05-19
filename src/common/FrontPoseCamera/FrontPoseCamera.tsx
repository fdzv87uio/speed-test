import React, { useRef } from 'react'
// Netpose tensor flow dependencies
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import * as tf from '@tensorflow/tfjs'
import * as posenet from '@tensorflow-models/posenet'
import '@tensorflow/tfjs-backend-webgl'
// web camera library
import Webcam from 'react-webcam'
//Styled components ref
import useCameraStyles from './FrontPoseCamera.styles'
import { drawTPose } from '../../../utils/tensorflow-utils'
import { Canvas } from '../Canvas/Canvas'
import { OrientationAxis } from '../OrientationAxis/OrientationAxis'
import { DeviceOrientationInfo } from '../../pages/pose-selection'

const FrontPoseCamera = ({
  deviceOrientation,
  permissionGranted,
}: {
  deviceOrientation: DeviceOrientationInfo
  permissionGranted: boolean
}): JSX.Element => {
  //Material Ui style classes
  const classes = useCameraStyles()
  // refs for both the webcam and canvas components
  const camRef = useRef(null)
  const canvasRef = useRef(null)
  // Constants
  const width = 400 // display width
  const height = 600 // height
  const posenetAccuracy = 0.50 // accuracy coef
  const detectionInterval = 1000 // time in msec
  //postnet configuration
  const outputStride = 8
  const inputResolution = 257
  const multiplier = 0.75

  // posenet function

  async function Posenet() {
    const net = await posenet.load({
      architecture: 'MobileNetV1',
      outputStride: outputStride,
      inputResolution: inputResolution,
      multiplier: multiplier,
    })

    setInterval(() => {
      detect(net)
    }, detectionInterval)
  }

  //Postnet detection method
  const detect = async (net) => {
    if (
      typeof camRef.current !== 'undefined' &&
      camRef.current !== null &&
      typeof camRef.current.video !== 'undefined' &&
      camRef.current.video.readyState === 4
    ) {
      // Get Video Properties
      const video = camRef.current.video
      const videoWidth = width
      const videoHeight = height
      // Make detections
      const pose = await net.estimateSinglePose(video)

      drawCanvas(pose, video, videoWidth, videoHeight, canvasRef)
    }
  }

  const drawCanvas = (pose, video, videoWidth, videoHeight, canvas) => {
    const ctx = canvas.current.getContext('2d')
    canvas.current.width = videoWidth
    canvas.current.height = videoHeight
    const kp = pose['keypoints']
    drawTPose(kp, posenetAccuracy, ctx)
  }

  const startPoseNet = async () => {
    if (
      typeof window !== 'undefined' &&
      typeof window.navigator !== 'undefined'
    ) {
      Posenet()
    }
  }

  startPoseNet()

  return (
    <>
      {typeof window !== 'undefined' &&
      typeof window.navigator !== 'undefined' ? (
        <Webcam
          className={classes.camera}
          audio={false}
          ref={camRef}
          width={width}
          height={height}
        />
      ) : null}
      {typeof window !== 'undefined' &&
      typeof window.navigator !== 'undefined' ? (
        <canvas
          className={classes.canvas}
          ref={canvasRef}
          width={width}
          height={height}
        />
      ) : null}
      {permissionGranted === true ? (
        <Canvas width={width} height={height} dpr={1} isAnimating={true}>
          <OrientationAxis
            beta={deviceOrientation?.beta}
            gamma={deviceOrientation?.gamma}
          ></OrientationAxis>
        </Canvas>
      ) : null}
    </>
  )
}

export default FrontPoseCamera
