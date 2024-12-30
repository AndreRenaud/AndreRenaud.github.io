// get a random number within a range
function random(min, max) {
    return Math.random() * (max - min) + min;
}

// calculate the distance between two points
function calculateDistance(p1x, p1y, p2x, p2y) {
    var xDistance = p1x - p2x,
        yDistance = p1y - p2y;
    return Math.sqrt(Math.pow(xDistance, 2) + Math.pow(yDistance, 2));
}

// create firework
class Firework {
    constructor(sx, sy, tx, ty) {
        // actual coordinates
        this.x = sx;
        this.y = sy;
        // starting coordinates
        this.sx = sx;
        this.sy = sy;
        // target coordinates
        this.tx = tx;
        this.ty = ty;
        this.hue = random(0, 360);
        // distance from starting point to target
        this.distanceToTarget = calculateDistance(sx, sy, tx, ty);
        this.distanceTraveled = 0;
        // track the past coordinates of each firework to create a trail effect, increase the coordinate count to create more prominent trails
        this.coordinates = [];
        this.coordinateCount = 3;
        // populate initial coordinate collection with the current coordinates
        while (this.coordinateCount--) {
            this.coordinates.push([this.x, this.y]);
        }
        this.angle = Math.atan2(ty - sy, tx - sx);
        this.speed = 2;
        this.acceleration = 1.1;
        this.brightness = random(50, 70);
    }

    // update firework
    update() {
        // remove last item in coordinates array
        this.coordinates.pop();
        // add current coordinates to the start of the array
        this.coordinates.unshift([this.x, this.y]);

        // speed up the firework
        this.speed *= this.acceleration;

        // get the current velocities based on angle and speed
        var vx = Math.cos(this.angle) * this.speed,
            vy = Math.sin(this.angle) * this.speed;
        // how far will the firework have traveled with velocities applied?
        this.distanceTraveled = calculateDistance(this.sx, this.sy, this.x + vx, this.y + vy);

        // if the distance traveled, including velocities, is greater than the initial distance to the target, then the target has been reached
        if (this.distanceTraveled >= this.distanceToTarget) {
            return true;
        } else {
            // target not reached, keep traveling
            this.x += vx;
            this.y += vy;
            return false;
        }
    }

    // draw firework
    draw(ctx) {
        ctx.beginPath();
        // move to the last tracked coordinate in the set, then draw a line to the current x and y
        ctx.moveTo(
            this.coordinates[this.coordinates.length - 1][0],
            this.coordinates[this.coordinates.length - 1][1]
        );
        ctx.lineTo(this.x, this.y);
        ctx.strokeStyle = 'hsl(' + this.hue + ', 100%, ' + this.brightness + '%)';
        ctx.lineWidth = 2;
        ctx.stroke();
    }
}

// create particle
class Particle {
    constructor(hue, x, y) {
        this.x = x;
        this.y = y;
        // track the past coordinates of each particle to create a trail effect, increase the coordinate count to create more prominent trails
        this.coordinates = [];
        for (let i = 0; i < 5; i++) {
            this.coordinates.push([this.x, this.y]);
        }
        // set a random angle in all possible directions, in radians
        this.angle = random(0, Math.PI * 2);
        this.speed = random(1, 5);
        // friction will slow the particle down
        this.friction = 1.02;
        // gravity will be applied and pull the particle down
        this.gravity = 1;
        // set the hue to a random number +-20 of the overall hue variable
        this.hue = random(hue - 20, hue + 20);
        this.brightness = random(50, 100);
        this.alpha = 1;
        // set how fast the particle fades out
        this.decay = random(0.005, 0.02);
    }

    // update particle - returns true if this particle should be removed
    update() {
        // remove last item in coordinates array
        this.coordinates.pop();
        // add current coordinates to the start of the array
        this.coordinates.unshift([this.x, this.y]);
        // slow down the particle
        this.speed /= this.friction;
        // apply velocity
        this.x += Math.cos(this.angle) * this.speed;
        this.y += Math.sin(this.angle) * this.speed + this.gravity;
        // fade out the particle
        this.alpha -= this.decay;

        // remove the particle once the alpha is low enough, based on the passed in index
        return this.alpha <= this.decay;
    }

    // draw particle
    draw(ctx) {
        ctx.beginPath();
        // move to the last tracked coordinates in the set, then draw a line to the current x and y
        ctx.moveTo(
            this.coordinates[this.coordinates.length - 1][0],
            this.coordinates[this.coordinates.length - 1][1]
        );
        ctx.lineTo(this.x, this.y);
        ctx.strokeStyle =
            'hsla(' + this.hue + ', 100%, ' + this.brightness + '%, ' + this.alpha + ')';
        ctx.stroke();
    }
}

export class Fireworks {
    constructor(canvas) {
        this.fireworks = [];
        this.particles = [];
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
    }

    update() {
        // Update all the fireworks & particles. Remove the ones that are done
        for (let i = this.fireworks.length - 1; i >= 0; i--) {
            if (this.fireworks[i].update(i)) {
                this.createParticles(
                    this.fireworks[i].hue,
                    random(20, 30),
                    this.fireworks[i].tx,
                    this.fireworks[i].ty
                );
                this.fireworks.splice(i, 1);
            }
        }
        for (let i = this.particles.length - 1; i >= 0; i--) {
            if (this.particles[i].update(i)) {
                this.particles.splice(i, 1);
            }
        }
    }
    // create particle group/explosion
    createParticles(hue, count, x, y) {
        // increase the particle count for a bigger explosion, beware of the canvas performance hit with the increased particles though
        while (count-- > 0) {
            this.particles.push(new Particle(hue, x, y));
        }
    }

    count() {
        return this.fireworks.length + this.particles.length;
    }

    addFirework() {
        const sx = Math.random() * this.canvas.width;
        const sy = this.canvas.height;
        const tx = Math.random() * this.canvas.width;
        const ty = Math.random() * this.canvas.height * 0.5;
        this.fireworks.push(new Firework(sx, sy, tx, ty));
    }

    draw() {
        this.fireworks.forEach((firework) => firework.draw(this.ctx));
        this.particles.forEach((particle) => particle.draw(this.ctx));
    }
}
