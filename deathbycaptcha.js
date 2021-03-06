// Generated by CoffeeScript 1.6.3
(function() {
  var Captcha, DeathByCaptcha, EventEmitter, http, request,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  EventEmitter = require("events").EventEmitter;

  request = require("request");

  http = require("http");

  Captcha = (function(_super) {
    __extends(Captcha, _super);

    function Captcha(dbc, uri) {
      var pollStatus,
        _this = this;
      this.uri = uri;
      this.id = this.uri.replace("" + dbc.endpoint + "/captcha/", "");
      pollStatus = function() {
        return request.get({
          url: _this.uri,
          headers: {
            accept: "application/json"
          }
        }, function(err, resp, body) {
          if (err != null) {
            return _this.emit("error", err);
          }
          if (resp.statusCode !== 200) {
            return _this.emit("error", new Error(http.STATUS_CODES[resp.statusCode]));
          }
          body = JSON.parse(body);
          if (!body.text) {
            setTimeout(pollStatus, 2000);
          }
          if (body.text) {
            return _this.emit("solved", body.text, body.is_correct);
          }
        });
      };
      process.nextTick(pollStatus);
    }

    return Captcha;

  })(EventEmitter);

  module.exports = DeathByCaptcha = (function() {
    function DeathByCaptcha(username, password, endpoint) {
      this.username = username;
      this.password = password;
      this.endpoint = endpoint != null ? endpoint : "http://api.dbcapi.me/api";
    }

    DeathByCaptcha.prototype.solve = function(img) {
      var _this = this;
      return new Promise(
        function(resolve, reject) {
          request.post({
            url: "" + _this.endpoint + "/captcha",
            headers: {
              "content-type": "multipart/form-data"
            },
            multipart: [
              {
                "content-disposition": "form-data; name=\"captchafile\"; filename=\"captcha\"",
                "content-type": "application/octet-stream",
                body: img
              }, {
                "content-disposition": "form-data; name=\"username\"",
                body: _this.username
              }, {
                "content-disposition": "form-data; name=\"password\"",
                body: _this.password
              }
            ]
          }, function(err, resp, body) {
            console.log('oi');
            var captcha;
            if (err != null) {
              return resolve(new Error(err));
            }
            switch (resp.statusCode) {
              case 303:
                captcha = new Captcha(_this, resp.headers.location);
                captcha.on("error", function(err) {
                  reject(err);
                });
                captcha.on("solved", function(solution) {
                  resolve({id: captcha.id, solution: solution});
                });
                break;
              case 403:
                return reject(new Error("Invalid login / Insufficient credits."));
              case 400:
                return reject(new Error("Invalid image."));
              case 503:
                return reject(new Error("Temporarily unavailable."));
              default:
                return reject(new Error("Unexpected error."));
            }
          });
        }
      );
    };

    DeathByCaptcha.prototype.get = function(id, cb) {
      var captcha, url;
      url = "" + this.endpoint + "/captcha/" + id;
      captcha = new Captcha(this, url);
      captcha.on("error", function(err) {
        return cb(err);
      });
      return captcha.on("solved", function(solution, isCorrect) {
        return cb(null, solution, isCorrect);
      });
    };

    DeathByCaptcha.prototype.report = function(id, cb) {
      var url;
      url = "" + this.endpoint + "/captcha/" + id + "/report";
      return request.post({
        url: url,
        form: {
          username: this.username,
          password: this.password
        }
      }, function(err, resp, body) {
        if (err != null) {
          return cb(err);
        }
        if (resp.statusCode !== 200) {
          return cb(new Error(http.STATUS_CODES[resp.statusCode]));
        }
        return cb(null);
      });
    };

    DeathByCaptcha.prototype.balance = function(cb) {
      return request.post({
        url: "" + this.endpoint + "/user",
        headers: {
          accept: "application/json"
        },
        form: {
          username: this.username,
          password: this.password
        }
      }, function(err, resp, body) {
        var balance, credits, rate;
        if (err != null) {
          return cb(err);
        }
        if (resp.statusCode !== 200) {
          return cb(new Error(http.STATUS_CODES[resp.statusCode]));
        }
        body = JSON.parse(body);
        balance = body.balance, rate = body.rate;
        credits = Math.floor(balance / rate);
        return cb(null, credits, balance, rate);
      });
    };

    return DeathByCaptcha;

  })();

}).call(this);
