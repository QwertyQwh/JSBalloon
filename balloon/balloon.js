

//Setting up the canvases
const canvas = document.querySelector('canvas')
const ctx = canvas.getContext('2d')
const surface = document.createElement('canvas')
const surfaceCtx = surface.getContext('2d')
const padding =0


// import the required modules
const VecMath = require("gl-matrix")
const createTouch = require('touches')
const app = require('canvas-loop')(ctx.canvas, {
    parent:canvas,
    scale: Math.min(2, window.devicePixelRatio)
  })
const clamp = require('clamp')
const random = require('random-float')
const newArray = require('new-array')
const randomColor = require('random-color')
const RawImage = require('raw-image')

// Constant Gloabl Variabless
let SunPos = VecMath.vec2.fromValues(0,0)
const splatInterval = 5
const gravity = -5
const skyLimit = 250
const capacity = 800
const image = new RawImage("assets/heart7.jpg",{width:window.innerWidth, height:window.innerHeight})


// Changeable global variables
let lastPosition = VecMath.vec2.fromValues(0,0)
let lastSplatPosition = VecMath.vec2.create()
let first = true
let dragging = false
let points = []


//Balloon Interface 
//v = v_0 e^{-at} in the x and y direction
//the acceleration in the z direciton is constant
class Balloon{
    constructor(pos, initV, vDecline, size ){
        this.initPos = this.CurPos = pos
        this.InitAngle =random(-Math.PI/4,Math.PI/4) 
        this.EndAngle =random(-Math.PI/4,Math.PI/4) 
        this.CurAngle = this.InitAngle
        this.duration = random(6,12)
        // console.log(this.color )
        this.v0 = initV
        this.a = vDecline
        this.active = true
        this.timePassed = 0
        this.size = size
        // this.color =  randomColor().hexString();
        let finalpos = this.GetFinalPosition2D()
        let pixel = image.get(Math.floor(finalpos[0]),Math.floor(finalpos[1]))
        this.valid = true
        if(pixel === undefined){
          this.valid = false
        }else{
          this.color = `rgb(${pixel.red},${pixel.green},${pixel.blue})`;
        }
    }

    GetFinalPosition2D(){
        let finalx = this.initPos[0] + this.v0[0]/this.a[0];
        let finaly = this.initPos[1] + this.v0[1]/this.a[1];
        return VecMath.vec2.fromValues(finalx,finaly)
    }

    UpdatePos(dt){
        dt = dt/1000
        let vx = this.v0[0]*Math.exp(-this.a[0]*this.timePassed)
        let vy = this.v0[1]*Math.exp(-this.a[1]*this.timePassed)
        let vz = this.v0[2]+(this.a[2]-gravity)*this.timePassed
        VecMath.vec3.set(this.CurPos, this.CurPos[0]+vx*dt, this.CurPos[1]+vy*dt, this.CurPos[2]+vz*dt)
        this.CurAngle = clamp(this.InitAngle+this.timePassed*(this.EndAngle-this.InitAngle)/this.duration,this.InitAngle,this.EndAngle)
        this.timePassed += dt
        if(this.CurPos[2]>skyLimit || this.timePassed>this.duration){
            this.active = false
        }
    }

    Render(curCtx){
        let sz = clamp(this.size*(this.CurPos[2]/20), 0, 100)
        curCtx.fillStyle = this.color
        // curCtx.moveTo(this.CurPos[0]+sz, this.CurPos[1])
        // curCtx.ellipse(this.CurPos[0], this.CurPos[1], sz, sz,0,0, Math.PI*2, false)
        let x = this.CurPos[0]
        let y = this.CurPos[1]
        sz = sz
        curCtx.save()
        
        curCtx.translate(x,y)
        curCtx.rotate(this.CurAngle)
        curCtx.translate(-x,-y)
        curCtx.beginPath()
        curCtx.moveTo(x,y)

        curCtx.bezierCurveTo(x+0.4*sz, y-0.8*sz, x+1.5*sz, y+0.5*sz, x, y+sz);
        curCtx.bezierCurveTo(x-1.5*sz, y+0.5*sz,x-0.4*sz,y-0.8*sz,  x, y);

        curCtx.closePath()
        curCtx.stroke()
        curCtx.fill()

        //Specular
        curCtx.beginPath()

        //Calculate relative angle to the sun 
        let angle = -Math.atan((SunPos[1]-y)/(SunPos[0]-x))+Math.PI/2
        angle+= this.CurAngle
        let t = AngleToTime(angle)
        
        //Move the ellipse farther into the center if z is small
        let pushFactor = 1-(skyLimit-this.CurPos[2])/skyLimit;

        let curveContact = SimpleBezier([x,y+0.3*sz],[x-(0.4*pushFactor+0.2)*sz,y-(0.4*pushFactor+0.2)*sz],[x-(0.4*pushFactor+0.4)*sz, y+(0.4*pushFactor+0.3)*sz],[x, y+0.8*sz],t)

        curCtx.moveTo(x-0.5*sz,y-0.1*sz)
        curCtx.fillStyle = "#fff0f0"
        // x-0.48*sz, y-0.05*sz
        curCtx.ellipse(curveContact[0],curveContact[1], sz*0.2,sz*0.1, -AngleToEllipseRot(angle),0,Math.PI*2,true)
        curCtx.fill()
        curCtx.closePath()

        curCtx.restore()


        // curCtx.fillRect(this.CurPos[0], this.CurPos[1],10,10)
        // curCtx.arc(this.CurPos[0], this.CurPos[1], 100, 50, 0, 2 * Math.PI)
    }

}

//Assuming the Sunlight is always on the left (which is lame). 
//This is an approximation anyway
function AngleToTime(alpha){
  // if(alpha<=Math.PI/2){
  //   //use the half circle as approximation
  //   return alpha/Math.PI*0.5
  // }else{
  //   //use the linear equation as approximation (as the elliptic integral is hard to compute and an overkill)
  //   console.log((1-1/(0.6*Math.tan(alpha-Math.PI/2)+2)))
  //   // return (1-1/(0.6*Math.tan(alpha-Math.PI/2)+1))*0.5+0.5
  //   return (alpha-Math.PI/2)
  // }
  return alpha/Math.PI
}


function AngleToEllipseRot(alpha){
  if(alpha<Math.PI/2){
    return alpha*2-Math.PI/2
  }else{
    return (alpha-Math.PI/2)*0.8+Math.PI/2
  }
}

function SimpleBezier(Ps,Pc1,Pc2,Pe,t){
  let x = Ps[0]*Math.pow((1-t),3)+Pc1[0]*3*t*Math.pow(1-t,2)+Pc2[0]*3*Math.pow(t,2)*(1-t)+Pe[0]*Math.pow(t,3)
  let y = Ps[1]*Math.pow((1-t),3)+Pc1[1]*3*t*Math.pow(1-t,2)+Pc2[1]*3*Math.pow(t,2)*(1-t)+Pe[1]*Math.pow(t,3)
  return VecMath.vec2.fromValues(x,y)
}




//Create dragging controls
createTouch(window, { target: canvas, filtered: true })
  .on('start', (ev, pos) => {
    dragging = true
    lastPosition = VecMath.vec2.fromValues(pos[0],pos[1])
    lastSplatPosition = VecMath.vec2.clone(lastPosition)
  })
  .on('move', (ev, pos) => {
    if (!dragging) return
    if (first) {
      first = false
      lastPosition = VecMath.vec2.fromValues(pos[0],pos[1])
      lastSplatPosition = VecMath.vec2.clone(lastPosition)
      return
    }
    
    if (VecMath.vec2.dist(lastPosition,lastSplatPosition) >= splatInterval) {
        splat(pos, lastPosition)
        VecMath.vec2.copy(lastSplatPosition,pos)
    }
    VecMath.vec2.copy(lastPosition,pos)
  })
  .on('end', () => {
    dragging = false
  })




  function splat (position, lastPosition) {

    const amount = Math.floor(random(5, 20))
    const count = clamp(capacity - points.length, 0, amount)
    if (count === 0) return
    addPoints(count, position, lastPosition)
  }

  function addPoints (n, origin, prevPos) {
    // Born Position Offset
    // const hiOff = Math.random() > 0.9 ? random(30, 40) : random(0.5, 1)
    const offsetScale = random(5, 40)
    const newPoints = newArray(n).map(() => {
      const offset = Math.random() * offsetScale
      const newPosition = VecMath.vec3.fromValues(origin[0],origin[1],0)
      const angle = Math.random() * Math.PI * 2
      newPosition[0] += Math.cos(angle) * offset
      newPosition[1] += Math.sin(angle) * offset
      newPosition[2] = random(1, 50)
      let x = Math.random()>0.8? random(-200,200):random(-30,30)
      let y = Math.random()>0.8? random(-200,200):random(-30,30)
      let a = random(0.3,5)
      let b = random(0.3,5)
      let c = random(-3,5)
      //Set a,b to 10 to have a sprinkle effect
      let res = VecMath.vec2.create()
      VecMath.vec2.sub(res, origin, prevPos)
      const point = new Balloon(newPosition,VecMath.vec3.fromValues(x+res[0]*5,y+res[1]*5,0), VecMath.vec3.fromValues(a,b,c),random(0.3,2.0))
    //   point.size = random(0.015, 2.5)
    //   point.alpha = random(0.8, 1.0)
      
      return point
    })


    
    newPoints.forEach(x => {if(x.valid){points.push(x)}})
    return newPoints
  }





  //The actual entry
  app.start()




app.once('tick', () => {
    const [ width, height ] = app.shape
    surface.width = width * app.scale
    surface.height = height * app.scale
    surfaceCtx.scale(app.scale, app.scale)
    surfaceCtx.clearRect(0, 0, width, height)
    surfaceCtx.fillStyle = "#ffefef"
    surfaceCtx.fillRect(0, 0, width, height)
  })
  app.on('tick', tick)


  // The update function 
  // Note: dt is in milliseconds 
  function tick (dt) {
    dt = Math.min(30, dt)
    const [ width, height ] = app.shape

    SunPos[0] = -0.1*height
    SunPos[1] = 0.5*height
    points.forEach(b => b.UpdatePos(dt))
    ctx.save()
    ctx.scale(app.scale, app.scale)
    ctx.clearRect(0, 0, width, height)
    const surfWidth = surface.width / app.scale
    const surfHeight = surface.height / app.scale
    
    
    const tx = (width - surfWidth) / 2
    const ty = (height - surfHeight) / 2
    ctx.translate(tx, ty)
    ctx.drawImage(surface, 0, 0, surfWidth, surfHeight)
    ctx.translate(-tx, -ty)
    surfaceCtx.translate(-tx, -ty)
    
    // surfaceCtx.fillStyle = ctx.fillStyle = "#ff0000"

    points.forEach(pt => {
        if (pt.active) {
          pt.Render(ctx)
        } else {
         pt.Render(ctx)
         pt.Render(surfaceCtx)
        }
      })
      surfaceCtx.translate(tx, ty)
      ctx.restore()

      for (let i=points.length - 1; i>=0; i--) {
        if (!points[i].active) points.splice(i, 1)
      }
  }






  