"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var ws_1 = require("ws");
var dockerode_1 = require("dockerode");
var node_http_1 = require("node:http");
var node_url_1 = require("node:url");
var jsonwebtoken_1 = require("jsonwebtoken");
var client_ecr_1 = require("@aws-sdk/client-ecr");
var docker = new dockerode_1.default();
var TAG = "node-22-alpine";
var IMAGE_URI = "".concat(process.env.REGISTRY_URL, ":").concat(TAG);
function pullImageFromECR() {
    return __awaiter(this, void 0, void 0, function () {
        var ecrClient, authResponse, authData, decodedToken, _a, username, password, authConfig, stream_1, error_1;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 4, , 5]);
                    console.log("1. Authenticating with AWS ECR...");
                    ecrClient = new client_ecr_1.ECRClient({
                        region: process.env.AWS_REGION,
                        credentials: {
                            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY_id,
                        }
                    });
                    return [4 /*yield*/, ecrClient.send(new client_ecr_1.GetAuthorizationTokenCommand({}))];
                case 1:
                    authResponse = _b.sent();
                    authData = authResponse.authorizationData[0];
                    decodedToken = Buffer.from(authData.authorizationToken, "base64").toString("utf-8");
                    _a = decodedToken.split(":"), username = _a[0], password = _a[1];
                    console.log("2. Pulling image: ".concat(IMAGE_URI, "..."));
                    authConfig = {
                        username: username,
                        password: password,
                        serveraddress: process.env.REGISTRY_URL,
                    };
                    return [4 /*yield*/, docker.pull(IMAGE_URI, { authconfig: authConfig })];
                case 2:
                    stream_1 = _b.sent();
                    return [4 /*yield*/, new Promise(function (resolve, reject) {
                            docker.modem.followProgress(stream_1, function (err, res) { return (err ? reject(err) : resolve(res)); }, function (event) {
                                if (event.progress) {
                                    process.stdout.write("\r".concat(event.status, ": ").concat(event.progress));
                                }
                                else if (event.status) {
                                    console.log(event.status);
                                }
                            });
                        })];
                case 3:
                    _b.sent();
                    console.log("\nImage pulled successfully!");
                    return [3 /*break*/, 5];
                case 4:
                    error_1 = _b.sent();
                    console.error("Failed to pull image:", error_1);
                    return [3 /*break*/, 5];
                case 5: return [2 /*return*/];
            }
        });
    });
}
var wss = new ws_1.WebSocketServer({ noServer: true });
var server = node_http_1.default.createServer(function (req, res) {
    res.writeHead(200, { "content-type": "text/plan" });
    res.end("Http server is started before websocket conversion");
});
var authenticateUser = function (req, callback) {
    var parsedUrl = node_url_1.default.parse(req.url, true);
    var token = parsedUrl.query.token;
    // validate token 
    var secret = process.env.JWT_SECRET;
    if (!token) {
        return callback(new Error('Unauthorized'));
    }
    try {
        var decoded = jsonwebtoken_1.default.verify(token, secret);
        return callback(null, decoded);
    }
    catch (error) {
        return callback(new Error('Unauthorized'));
    }
};
server.on('upgrade', function (request, socket, head) {
    authenticateUser(request, function (err, user) {
        if (err || !user) {
            socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
            socket.destroy();
            return;
        }
        wss.handleUpgrade(request, socket, head, function (ws) {
            // Pass the authenticated user to the connection event
            wss.emit('connection', ws, request, user);
        });
    });
});
// as sson as challenge khole user , 
// authentication karnin
// why client are needed ?
// for one challenge , there should be a userId , challengeId , may be submissionId 
// user app par aaya , problem khola , to challengeId create kar do with status not_submitted and store it in the db
// upar ek submission ka button dikhao aur agar user ne us par submit kiya to us sumbission ko wo open kar sakta hai 
// for ex - agar user aaya aur usne kuch code likh rakha tha pehle se aur submit nahi kiya tha to bhi uski ek submission id ban jayegi
// aur agar code submit nahi hua hai to user ko hamesha wohi dikhni chahiye , to iske liye hume loop karna padega submission pe and then status se nikal sakte hai 
// submission wale button me only there will be completed submission
var Idcontainers = [];
wss.on('connection', function connection(ws, request, user) {
    return __awaiter(this, void 0, void 0, function () {
        var container_1, exec, stream_2, error_2;
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log('New WebSocket connection');
                    return [4 /*yield*/, pullImageFromECR()];
                case 1:
                    _a.sent();
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, 7, , 8]);
                    return [4 /*yield*/, docker.createContainer({
                            Image: process.env.IMAGE_BASE_URL,
                            Tty: true,
                            Cmd: ['/bin/sh'],
                            OpenStdin: true,
                            StdinOnce: false,
                            AttachStdout: true,
                            AttachStderr: true
                        })];
                case 3:
                    container_1 = _a.sent();
                    return [4 /*yield*/, container_1.start()];
                case 4:
                    _a.sent();
                    console.log("container started with container id ", container_1.id);
                    // now write the logic of fetching the code from the user s3
                    Idcontainers.push(container_1.id);
                    return [4 /*yield*/, container_1.exec({
                            Cmd: ['/bin/sh'],
                            AttachStdout: true,
                            AttachStderr: true,
                            AttachStdin: true,
                            Tty: true
                        })];
                case 5:
                    exec = _a.sent();
                    return [4 /*yield*/, exec.start({
                            hijack: true,
                            stdin: true
                        })];
                case 6:
                    stream_2 = _a.sent();
                    stream_2.on("data", function (chunk) {
                        console.log(chunk.toString());
                        ws.send(chunk);
                    });
                    // 7. Handle cleanup on exit
                    stream_2.on('end', function () {
                        console.log('Shell session ended');
                    });
                    stream_2.on('error', function (err) {
                        console.error('Stream error:', err);
                        ws.send("hello");
                    });
                    ws.on('message', function (data) {
                        var command = typeof data === 'string' ? data : data.toString();
                        if (!command.endsWith('\n')) {
                            command += '\n';
                        }
                        console.log(command);
                        stream_2.write(command);
                    });
                    ws.on('error', console.error);
                    stream_2.on('error', console.error);
                    ws.on('close', function () {
                        stream_2.end();
                        container_1.stop().catch(function () { });
                        // @ts-ignore
                        Idcontainers.map(function (id) { return __awaiter(_this, void 0, void 0, function () {
                            var state, info;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, docker.getContainer(id)];
                                    case 1:
                                        state = _a.sent();
                                        return [4 /*yield*/, state.inspect()];
                                    case 2:
                                        info = _a.sent();
                                        if (!info.State.Running) return [3 /*break*/, 4];
                                        return [4 /*yield*/, docker.getContainer(id).kill()];
                                    case 3:
                                        _a.sent();
                                        console.log("Container with container id : " + id + " killed");
                                        return [3 /*break*/, 5];
                                    case 4:
                                        console.log("Container with container id : " + id + " already killed");
                                        _a.label = 5;
                                    case 5: return [2 /*return*/];
                                }
                            });
                        }); });
                    });
                    return [3 /*break*/, 8];
                case 7:
                    error_2 = _a.sent();
                    console.error(error_2);
                    ws.send('Error: ' + error_2.message);
                    ws.close();
                    return [3 /*break*/, 8];
                case 8: return [2 /*return*/];
            }
        });
    });
});
server.listen(8080, function () {
    console.log('Server is listening on http://localhost:8080');
});
