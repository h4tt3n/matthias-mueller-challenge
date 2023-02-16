
class Vector2 {
    
    constructor(x, y) {
        this.x = x || 0;
        this.y = y || 0;
    }

    //
    add(v){ 
        if (v instanceof Vector2){
            return new Vector2(this.x + v.x, this.y + v.y); 
        }
    }
    sub(v){ 
        if (v instanceof Vector2){
            return new Vector2(this.x - v.x, this.y - v.y);
        }
    }
    mul(s){ 
        if (s instanceof Vector2){
            return new Vector2(this.x * s.x, this.y * s.y);
        }
        else {
            return new Vector2(this.x * s, this.y * s);
        }
    }
    div(s){ 
        return new Vector2(this.x / s, this.y / s );
    }

    //
    abs() { 
        return new Vector2( Math.abs(this.x), Math.abs(this.y) ); 
    }
    angleFromUnitVector(n) { 
        if (v instanceof Vector2){
            return Math.atan2(n.y, n.x);
        }
    }
    component(v) { 
        if (v instanceof Vector2){
            if(v === new Vector2()){
                return new Vector2();
            } else {
                var result = v.mul( this.dot(v)) / (v.dot(v) ); 
                return new Vector2(result.x, result.y);
            }
        }
    }
    dot(v){ 
        if (v instanceof Vector2){
            return this.x * v.x + this.y * v.y; 
        }
        else { 
            return new Vector2(this.x * v, this.y * v); 
        }
    }
    length() { 
        return Math.sqrt(this.lengthSquared());
    }
    lengthSquared() { 
        return this.dot(this);
    }
    perp() { 
        return new Vector2(-this.y, this.x); 
    }
    perpDot(v) { 
        if (v instanceof Vector2){
            return this.x * v.y - this.y * v.x; 
        } 
        else { 
            return new Vector2(-this.y * v, this.x * v); 
        }
    }
    project(v) { 
        if (v instanceof Vector2){
            if(this === new Vector2()){
                return new Vector2();
            } else {
                var result = (this.mul( v.dot(this) / this.dot(this) ));
                return new Vector2(result.x, result.y);
            }
        }
    }
    randomizeCircle(b) {	
        let a = Math.random() * 2.0 * Math.PI; 
        let r = Math.sqrt( Math.random() * b * b ); 
        return new Vector2( Math.cos(a) * r, Math.sin(a) * r ); 
    }
    randomizeSquare(b) { 
        return new Vector2( ( Math.random() - Math.random() ) * b, ( Math.random() - Math.random() ) * b ); 
    }
    rotate(v) { 
        if (v instanceof Vector2){
            var vec = new Vector2(v.x, -v.y);
            return new Vector2(vec.dot(this), vec.perpDot(this));
        } 
        else {
            return new Vector2();
        }
    }
    unit() { 
        var length = this.length();
        if(length === 0){
            return new Vector2();
        } else {
            return new Vector2( this.x / length, this.y / length );
        }
    }
    unitVectorFromAngle(a) { 
        return new Vector2(Math.cos(a), Math.sin(a)); 
    }
};

export { Vector2 };