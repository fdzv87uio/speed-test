/**
 * @license
 * Copyright 2019 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */
import * as posenet from '@tensorflow-models/posenet'
import * as tf from '@tensorflow/tfjs-core'
import variance from 'compute-variance'

const color = 'aqua'
const boundingBoxColor = 'red'
const lineWidth = 2

export const tryResNetButtonName = 'tryResNetButton'
export const tryResNetButtonText = '[New] Try ResNet50'
const tryResNetButtonTextCss = 'width:100%;text-decoration:underline;'
const tryResNetButtonBackgroundCss = 'background:#e61d5f;'

function isAndroid() {
  return /Android/i.test(navigator.userAgent)
}

function isiOS() {
  return /iPhone|iPad|iPod/i.test(navigator.userAgent)
}

export function isMobile() {
  return isAndroid() || isiOS()
}

function setDatGuiPropertyCss(propertyText, liCssString, spanCssString = '') {
  var spans = document.getElementsByClassName('property-name')
  for (var i = 0; i < spans.length; i++) {
    var text = spans[i].textContent || spans[i].innerText
    if (text === propertyText) {
      spans[i].parentNode.parentNode.style = liCssString
      if (spanCssString !== '') {
        spans[i].style = spanCssString
      }
    }
  }
}

export function updateTryResNetButtonDatGuiCss() {
  setDatGuiPropertyCss(
    tryResNetButtonText,
    tryResNetButtonBackgroundCss,
    tryResNetButtonTextCss
  )
}

/**
 * Toggles between the loading UI and the main canvas UI.
 */
export function toggleLoadingUI(
  showLoadingUI,
  loadingDivId = 'loading',
  mainDivId = 'main'
) {
  if (showLoadingUI) {
    document.getElementById(loadingDivId).style.display = 'block'
    document.getElementById(mainDivId).style.display = 'none'
  } else {
    document.getElementById(loadingDivId).style.display = 'none'
    document.getElementById(mainDivId).style.display = 'block'
  }
}

function toTuple({ y, x }) {
  return [y, x]
}

// This method draws the outer ring of a pointer
export function drawRing(ctx, y, x, r, color) {
  ctx.beginPath()
  ctx.arc(x, y, r + 7, 0, Math.PI * 2, false) // outer (filled)
  ctx.arc(x, y, r + 2, 0, Math.PI * 2, true) // outer (unfills it)
  ctx.fillStyle = color
  ctx.fill()
}

//This method draws the body of the pointer
export function drawPoint(ctx, y, x, r, color) {
  ctx.beginPath()
  ctx.arc(x, y, r, 0, 2 * Math.PI)
  ctx.fillStyle = color
  ctx.fill()
}

/**
 * Draws a line on a canvas, i.e. a joint
 */
export function drawSegment([ay, ax], [by, bx], color, scale, ctx) {
  ctx.beginPath()
  ctx.moveTo(ax * scale, ay * scale)
  ctx.lineTo(bx * scale, by * scale)
  ctx.lineWidth = lineWidth
  ctx.strokeStyle = color
  ctx.stroke()
}

/**
 * Draws a pose skeleton by looking up all adjacent keypoints/joints
 */
export function drawSkeleton(keypoints, minConfidence, ctx, scale = 1) {
  const adjacentKeyPoints = posenet.getAdjacentKeyPoints(
    keypoints,
    minConfidence
  )

  adjacentKeyPoints.forEach((keypoints) => {
    drawSegment(
      toTuple(keypoints[0].position),
      toTuple(keypoints[1].position),
      color,
      scale,
      ctx
    )
  })
}

/******************************************************************************************** */
/******************************************************************************************** */

// Arithmetic methods to calculate eucledian distance and ellipse distance
function euclideanDistance(x1, y1, x2, y2) {
  var a = x1 - x2
  var b = y1 - y2

  var c = Math.sqrt(a * a + b * b)
  return c
}

function ellipseDistance(x1, y1, x2, y2) {
  var a = x1 - x2
  var b = y1 - y2

  var c = (a * a) / 10000 + (b * b) / 10000
  return c
}

function isInsideCircle(x1, y1, x2, y2, radius) {
  var result = euclideanDistance(x1, y1, x2, y2)
  if (y1 < y2 + 100) {
    return true
  }
  return false
}

function isInsideEllipse(x1, y1, x2, y2) {
  if (x1 > x2 - 50 && x1 < x2 + 50) {
    return true
  }
  return false
}

var dct = {}

// The following function detects if the front T pose is satisfied
function validateTPose(data) {
  let isTposeSatisfied = 0

  if (data['rightShoulder'] != undefined) {
    dct['leftS'] = data.rightShoulder
  }

  if (data['leftShoulder'] != undefined) {
    dct['rightS'] = data.leftShoulder
  }
  if (
    data['rightShoulder'] != undefined &&
    data['rightElbow'] != undefined &&
    data['rightWrist'] != undefined
  ) {
    var leftShoulder = data.rightShoulder

    var leftWrist = data.rightWrist
    var leftElbow = data.rightElbow
    var d1 = euclideanDistance(
      leftShoulder.x,
      leftShoulder.y,
      leftElbow.x,
      leftElbow.y
    )
    var d2 = euclideanDistance(
      leftWrist.x,
      leftWrist.y,
      leftElbow.x,
      leftElbow.y
    )

    dct['left'] = d1 + d2
    dct['leftS'] = leftShoulder
  }

  if (
    data['leftShoulder'] != undefined &&
    data['leftElbow'] != undefined &&
    data['leftWrist'] != undefined
  ) {
    var rightShoulder = data.leftShoulder
    var rightWrist = data.leftWrist
    var rightElbow = data.leftElbow
    var d1 = euclideanDistance(
      rightShoulder.x,
      rightShoulder.y,
      rightElbow.x,
      rightElbow.y
    )
    var d2 = euclideanDistance(
      rightWrist.x,
      rightWrist.y,
      rightElbow.x,
      rightElbow.y
    )

    dct['right'] = d1 + d2
    dct['rightS'] = rightShoulder
  }

  if (data['rightShoulder'] != undefined && data['leftShoulder'] != undefined) {
    var leftShoulder = data['leftShoulder']
    var rightShoulder = data['rightShoulder']
    var middle = rightShoulder.x + (leftShoulder.x - rightShoulder.x) / 2
    dct['middle'] = middle
  } else if (dct['middle'] != undefined) {
  }
  if (dct['middle'] != undefined) {
    if (data['leftAnkle'] != undefined) {
      dct['leftA'] = data['leftAnkle']
    }
  }
  if (dct['leftA'] != undefined && dct['middle'] != undefined) {
  }

  if (data['rightWrist'] != undefined) {
    let leftWrist = data['rightWrist']

    if (dct['left'] != undefined) {
      if (
        isInsideCircle(
          leftWrist.x,
          leftWrist.y,
          dct['leftS'].x - dct['left'],
          dct['leftS'].y + 50,
          50
        )
      ) {
        isTposeSatisfied += 1
      }
    }
  } else if (dct['left'] != undefined) {
  }

  if (data['leftWrist'] != undefined) {
    let leftWrist = data['leftWrist']

    if (dct['right'] != undefined) {
      if (
        isInsideCircle(
          leftWrist.x,
          leftWrist.y,
          dct['rightS'].x - dct['right'],
          dct['rightS'].y + 50,
          50
        )
      ) {
        isTposeSatisfied += 1
      }
    }
  } else if (dct['right'] != undefined) {
  }

  if (data['rightAnkle'] != undefined) {
    var leftAnkle = data['rightAnkle']
    if (dct['middle'] != undefined && dct['leftA'] != undefined) {
      if (leftAnkle.x < dct['middle'] - 100) {
        isTposeSatisfied += 1
      }
    }
  }

  if (data['leftAnkle'] != undefined) {
    var leftAnkle = data['leftAnkle']
    if (dct['middle'] != undefined && dct['leftA'] != undefined) {
      if (leftAnkle.x < dct['middle'] + 100) {
        isTposeSatisfied += 1
      }
    }
  }
  return isTposeSatisfied
}

export function drawTPose(keypoints, minConfidence, ctx, scale = 1) {
  // wrists
  var kp9 = keypoints[9] //left
  var kp10 = keypoints[10] //right
  //ankles
  var kp15 = keypoints[15] //left
  var kp16 = keypoints[16] //right

  //validate T Pose
  var validationResult = validateTPose(keypoints)
  console.log(validationResult)

  // Create conditional function to draw either white or orange dots depending on the axial Standard deviation
  // Positive case
  if (validationResult === 4) {
    if (kp9.score > minConfidence) {
      drawPoint(ctx, kp9.position.y, kp9.position.x, 25, '#FFD733')
      drawRing(ctx, kp9.position.y, kp9.position.x, 25, '#FFD733')
    }
    if (kp10.score > minConfidence) {
      drawPoint(ctx, kp10.position.y, kp10.position.x, 25, '#FFD733')
      drawRing(ctx, kp10.position.y, kp10.position.x, 25, '#FFD733')
    }
    if (kp15.score > minConfidence) {
      drawPoint(ctx, kp15.position.y, kp15.position.x, 25, '#FFD733')
      drawRing(ctx, kp15.position.y, kp15.position.x, 25, '#FFD733')
    }
    if (kp16.score > minConfidence) {
      drawPoint(ctx, kp16.position.y, kp16.position.x, 25, '#FFD733')
      drawRing(ctx, kp16.position.y, kp16.position.x, 25, '#FFD733')
    }
    return true //success flag

    //negative Case
  } else {
    if (kp9.score > minConfidence) {
      drawPoint(ctx, kp9.position.y, kp9.position.x, 25, '#FFFFFF')
      drawRing(ctx, kp9.position.y, kp9.position.x, 25, '#FFFFFF')
    }
    if (kp10.score > minConfidence) {
      drawPoint(ctx, kp10.position.y, kp10.position.x, 25, '#FFFFFF')
      drawRing(ctx, kp10.position.y, kp10.position.x, 25, '#FFFFFF')
    }
    if (kp15.score > minConfidence) {
      drawPoint(ctx, kp15.position.y, kp15.position.x, 25, '#FFFFFF')
      drawRing(ctx, kp15.position.y, kp15.position.x, 25, '#FFFFFF')
    }
    if (kp16.score > minConfidence) {
      drawPoint(ctx, kp16.position.y, kp16.position.x, 25, '#FFFFFF')
      drawRing(ctx, kp16.position.y, kp16.position.x, 25, '#FFFFFF')
    }
    return false // success flag
  }
}

/**
 * Draw pose keypoints onto a canvas using standar deviation
 */
export function drawKeypoints(keypoints, minConfidence, ctx, scale = 1) {
  //shoulders
  var kp5 = keypoints[5] //left
  var kp6 = keypoints[6] //right
  // wrists
  var kp9 = keypoints[9] //left
  var kp10 = keypoints[10] //right
  //ankles
  var kp15 = keypoints[15] //left
  var kp16 = keypoints[16] //right
  // create arrays for both the horizontal and vertical axis
  var horizontal = [
    kp9.position.y,
    kp10.position.y,
    kp5.position.y,
    kp6.position.y,
  ]
  var vertical = [
    kp15.position.x,
    kp16.position.x,
    kp5.position.x,
    kp6.position.x,
  ]
  // generate standard deviations
  var horizontalSD = Math.sqrt(variance(horizontal))
  var verticalSD = Math.sqrt(variance(vertical))
  console.log(horizontalSD, verticalSD)

  //SD Threashold constant
  const threshold = 45

  // Create conditional function to draw either white or orange dots depending on the axial Standard deviation
  // Positive case
  if (verticalSD < threshold && horizontalSD < threshold) {
    if (kp9.score > minConfidence) {
      drawPoint(ctx, kp9.position.y, kp9.position.x, 25, '#FFD733')
      drawRing(ctx, kp9.position.y, kp9.position.x, 25, '#FFD733')
    }
    if (kp10.score > minConfidence) {
      drawPoint(ctx, kp10.position.y, kp10.position.x, 25, '#FFD733')
      drawRing(ctx, kp10.position.y, kp10.position.x, 25, '#FFD733')
    }
    if (kp15.score > minConfidence) {
      drawPoint(ctx, kp15.position.y, kp15.position.x, 25, '#FFD733')
      drawRing(ctx, kp15.position.y, kp15.position.x, 25, '#FFD733')
    }
    if (kp16.score > minConfidence) {
      drawPoint(ctx, kp16.position.y, kp16.position.x, 25, '#FFD733')
      drawRing(ctx, kp16.position.y, kp16.position.x, 25, '#FFD733')
    }
    return true //success flag

    //negative Case
  } else {
    if (kp9.score > minConfidence) {
      drawPoint(ctx, kp9.position.y, kp9.position.x, 25, '#FFFFFF')
      drawRing(ctx, kp9.position.y, kp9.position.x, 25, '#FFFFFF')
    }
    if (kp10.score > minConfidence) {
      drawPoint(ctx, kp10.position.y, kp10.position.x, 25, '#FFFFFF')
      drawRing(ctx, kp10.position.y, kp10.position.x, 25, '#FFFFFF')
    }
    if (kp15.score > minConfidence) {
      drawPoint(ctx, kp15.position.y, kp15.position.x, 25, '#FFFFFF')
      drawRing(ctx, kp15.position.y, kp15.position.x, 25, '#FFFFFF')
    }
    if (kp16.score > minConfidence) {
      drawPoint(ctx, kp16.position.y, kp16.position.x, 25, '#FFFFFF')
      drawRing(ctx, kp16.position.y, kp16.position.x, 25, '#FFFFFF')
    }
    return false // success flag
  }
}

/**
 * Draw the bounding box of a pose. For example, for a whole person standing
 * in an image, the bounding box will begin at the nose and extend to one of
 * ankles
 */
export function drawBoundingBox(keypoints, ctx) {
  const boundingBox = posenet.getBoundingBox(keypoints)

  ctx.rect(
    boundingBox.minX,
    boundingBox.minY,
    boundingBox.maxX - boundingBox.minX,
    boundingBox.maxY - boundingBox.minY
  )

  ctx.strokeStyle = boundingBoxColor
  ctx.stroke()
}

/**
 * Converts an arary of pixel data into an ImageData object
 */
export async function renderToCanvas(a, ctx) {
  const [height, width] = a.shape
  const imageData = new ImageData(width, height)

  const data = await a.data()

  for (let i = 0; i < height * width; ++i) {
    const j = i * 4
    const k = i * 3

    imageData.data[j + 0] = data[k + 0]
    imageData.data[j + 1] = data[k + 1]
    imageData.data[j + 2] = data[k + 2]
    imageData.data[j + 3] = 255
  }

  ctx.putImageData(imageData, 0, 0)
}

/**
 * Draw an image on a canvas
 */
export function renderImageToCanvas(image, size, canvas) {
  canvas.width = size[0]
  canvas.height = size[1]
  const ctx = canvas.getContext('2d')

  ctx.drawImage(image, 0, 0)
}

/**
 * Draw heatmap values, one of the model outputs, on to the canvas
 * Read our blog post for a description of PoseNet's heatmap outputs
 * https://medium.com/tensorflow/real-time-human-pose-estimation-in-the-browser-with-tensorflow-js-7dd0bc881cd5
 */
export function drawHeatMapValues(heatMapValues, outputStride, canvas) {
  const ctx = canvas.getContext('2d')
  const radius = 5
  const scaledValues = heatMapValues.mul(tf.scalar(outputStride, 'int32'))

  drawPoints(ctx, scaledValues, radius, color)
}

/**
 * Used by the drawHeatMapValues method to draw heatmap points on to
 * the canvas
 */
function drawPoints(ctx, points, radius, color) {
  const data = points.buffer().values

  for (let i = 0; i < data.length; i += 2) {
    const pointY = data[i]
    const pointX = data[i + 1]

    if (pointX !== 0 && pointY !== 0) {
      ctx.beginPath()
      ctx.arc(pointX, pointY, radius, 0, 2 * Math.PI)
      ctx.fillStyle = color
      ctx.fill()
    }
  }
}

/**
 * Draw offset vector values, one of the model outputs, on to the canvas
 * Read our blog post for a description of PoseNet's offset vector outputs
 * https://medium.com/tensorflow/real-time-human-pose-estimation-in-the-browser-with-tensorflow-js-7dd0bc881cd5
 */
// export function drawOffsetVectors(
//   heatMapValues,
//   offsets,
//   outputStride,
//   scale = 1,
//   ctx
// ) {
//   const offsetPoints = posenet.decodeSinglePose.getOffsetPoints(
//     heatMapValues,
//     outputStride,
//     offsets
//   );

//   const heatmapData = heatMapValues.buffer().values;
//   const offsetPointsData = offsetPoints.buffer().values;

//   for (let i = 0; i < heatmapData.length; i += 2) {
//     const heatmapY = heatmapData[i] * outputStride;
//     const heatmapX = heatmapData[i + 1] * outputStride;
//     const offsetPointY = offsetPointsData[i];
//     const offsetPointX = offsetPointsData[i + 1];

//     drawSegment(
//       [heatmapY, heatmapX],
//       [offsetPointY, offsetPointX],
//       color,
//       scale,
//       ctx
//     );
//   }
// }
