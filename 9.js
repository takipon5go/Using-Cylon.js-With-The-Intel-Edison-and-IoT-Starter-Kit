"use strict";
 
var cylon = require("cylon");
 
cylon.api({
  host: "0.0.0.0",
  port: "3000",
  ssl: false
});
 
cylon.robot({
  name: "doorbot",
  connections: {
    edison: { adaptor: "intel-iot" }
  },
  devices: {
    // digital sensors
    button: { driver: "button",        pin: 2, connection: "edison" },
    led:    { driver: "led",           pin: 3, connection: "edison" },
    servo:  { driver: "servo",         pin: 5, connection: "edison" },
    buzzer: { driver: "direct-pin",    pin: 7, connection: "edison" },
    touch:  { driver: "button",        pin: 8, connection: "edison" },
    // analog sensors
    dial:   { driver: "analogSensor",  pin: 0, connection: "edison" },
    temp:   { driver: "upm-grovetemp", pin: 1, connection: "edison" },
    sound:  { driver: "analogSensor",  pin: 2, connection: "edison" },
    light:  { driver: "analogSensor",  pin: 3, connection: "edison" },
    // i2c devices
    screen: { driver: "upm-jhd1313m1", connection: "edison" }
  },
  fireAlarm: function() {
    var that = this;
    var deg = that.temp.value();
    console.log("current temp:", deg);
    if (deg >= 30) {
      that.writeMessage("Fire alarm!", "red");
      that.buzzer.digitalWrite(1);
      setTimeout(function() {
        that.buzzer.digitalWrite(0);
      }, 200);
    }
  },
  detectPerson: function(val) {
    var that = this;
    if (val >= 450) {
      console.log("sound:", val)
      that.writeMessage("Person detected", "blue");
      if (that.light.analogRead() <= 400) {
        that.led.turnOn();
        setInterval(function() {
          that.led.turnOff();
        }, 500);
      }
    }
  },
  turnLock: function(val) {
    var that = this;
    var currentAngle = that.servo.currentAngle();
    var angle = val.fromScale(0, 1023).toScale(0,180) | 0;
    if (angle <= currentAngle - 3 || angle >= currentAngle + 3) {
      console.log("turning lock:", angle);
      that.servo.angle(angle);
    }
  },
  doorbell: function() {
    var that = this;
    that.buzzer.digitalWrite(1);
    that.writeMessage("Doorbell pressed", "green");
    setTimeout(function() {
      that.buzzer.digitalWrite(0);
    }, 1000);
  },
  writeMessage: function(message, color) {
    var that = this;
    console.log(message);
    that.screen.setCursor(0,0);
    that.screen.write(pad(message.toString(), 16));
    switch(color)
    {
      case "red":
        that.screen.setColor(255, 0, 0);
        break;
      case "green":
        that.screen.setColor(0, 255, 0);
        break;
      case "blue":
        that.screen.setColor(0, 0, 255);
        break;
      default:
        that.screen.setColor(255, 255, 255);
        break;
    }
  },
  setup: function() {
    this.writeMessage("Doorbot ready");
    this.led.turnOff();
    this.buzzer.digitalWrite(0);
  },
  work: function() {
    var that = this;
    that.setup();

    that.button.on('push', function() {
      that.led.turnOn();
    });
 
    that.button.on('release', function() {
      that.led.turnOff();
    });

    that.dial.on('analogRead', function(val) {
      that.turnLock(val);
    });
 
    that.sound.on('analogRead', function(val) {
      that.detectPerson(val);
    });
 
    that.touch.on('push', function() {
      that.doorbell();
    });
 
    setInterval(function() {
      that.fireAlarm();
    }, 1000);
  }
}).start();

function pad(str, length) {
  return str.length < length ? pad(str + " ", length) : str;
};
