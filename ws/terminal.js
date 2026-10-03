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
var http = require("node:http");
var tar_stream_1 = require("tar-stream");
var url = require("node:url");
var jsonwebtoken_1 = require("jsonwebtoken");
var client_ecr_1 = require("@aws-sdk/client-ecr");
var prisma_1 = require("../prisma/lib/prisma");
var s3_1 = require("../src/helper/s3");
var node_stream_1 = require("node:stream");
var docker = new dockerode_1.default();
var TAG = "node-22-alpine";
var IMAGE_URI = "".concat(process.env.REGISTRY_URL, ":").concat(TAG);
var pullingImages = new Map();
var user_challenge_set = new Set();
function pathExists(container, targetPath) {
    return __awaiter(this, void 0, void 0, function () {
        var exec, stream_1, inspection, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 5, , 6]);
                    return [4 /*yield*/, container.exec({
                            Cmd: ["sh", "-c", "test -e \"".concat(targetPath, "\"")],
                        })];
                case 1:
                    exec = _a.sent();
                    return [4 /*yield*/, exec.start({})];
                case 2:
                    stream_1 = _a.sent();
                    return [4 /*yield*/, new Promise(function (resolve) { return stream_1.on("end", resolve); })];
                case 3:
                    _a.sent();
                    return [4 /*yield*/, exec.inspect()];
                case 4:
                    inspection = _a.sent();
                    return [2 /*return*/, inspection.ExitCode === 0];
                case 5:
                    error_1 = _a.sent();
                    console.error("Error checking path:", error_1);
                    return [2 /*return*/, false];
                case 6: return [2 /*return*/];
            }
        });
    });
}
function createFolder(container, baseFolder, newFolder) {
    return __awaiter(this, void 0, void 0, function () {
        var fullPath, makeFolder, stream_2, error_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 4, , 5]);
                    fullPath = baseFolder + "/" + newFolder;
                    return [4 /*yield*/, container.exec({
                            Cmd: ["mkdir", "-p", fullPath]
                        })];
                case 1:
                    makeFolder = _a.sent();
                    return [4 /*yield*/, makeFolder.start({})];
                case 2:
                    stream_2 = _a.sent();
                    return [4 /*yield*/, new Promise(function (resolve) { return stream_2.on("end", resolve); })];
                case 3:
                    _a.sent();
                    return [3 /*break*/, 5];
                case 4:
                    error_2 = _a.sent();
                    console.log("Some error occured while creating the folder", error_2);
                    return [3 /*break*/, 5];
                case 5: return [2 /*return*/];
            }
        });
    });
}
function createFile(container, baseFolder, newFile) {
    return __awaiter(this, void 0, void 0, function () {
        var fullFilePath, makeFile, stream_3, error_3;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 4, , 5]);
                    fullFilePath = baseFolder.endsWith("/") ? baseFolder + newFile : baseFolder + "/" + newFile;
                    return [4 /*yield*/, container.exec({
                            Cmd: ["touch", fullFilePath]
                        })];
                case 1:
                    makeFile = _a.sent();
                    return [4 /*yield*/, makeFile.start({})];
                case 2:
                    stream_3 = _a.sent();
                    return [4 /*yield*/, new Promise(function (resolve) { return stream_3.on("end", resolve); })];
                case 3:
                    _a.sent();
                    return [3 /*break*/, 5];
                case 4:
                    error_3 = _a.sent();
                    console.log("Some error while creating the file", error_3);
                    return [3 /*break*/, 5];
                case 5: return [2 /*return*/];
            }
        });
    });
}
function listDirectory(container, folderPath) {
    return __awaiter(this, void 0, void 0, function () {
        var exec, stream, rawOutput, errorOutput, stdout, stderr, inspection, items;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, container.exec({
                        Cmd: ["ls", "-1", "-p", folderPath],
                        AttachStdout: true,
                        AttachStderr: true,
                    })];
                case 1:
                    exec = _a.sent();
                    return [4 /*yield*/, exec.start({ hijack: true, stdin: false })];
                case 2:
                    stream = _a.sent();
                    rawOutput = "";
                    errorOutput = "";
                    stdout = new node_stream_1.PassThrough();
                    stderr = new node_stream_1.PassThrough();
                    stdout.on("data", function (chunk) { return (rawOutput += chunk.toString("utf-8")); });
                    stderr.on("data", function (chunk) { return (errorOutput += chunk.toString("utf-8")); });
                    container.modem.demuxStream(stream, stdout, stderr);
                    return [4 /*yield*/, new Promise(function (resolve) { return stream.on("end", resolve); })];
                case 3:
                    _a.sent();
                    return [4 /*yield*/, exec.inspect()];
                case 4:
                    inspection = _a.sent();
                    if (inspection.ExitCode !== 0) {
                        throw new Error("Failed to list directory: ".concat(errorOutput.trim()));
                    }
                    items = rawOutput
                        .split("\n")
                        .map(function (line) { return line.trim(); })
                        .filter(function (line) { return line.length > 0; })
                        .map(function (item) {
                        var isFolder = item.endsWith("/");
                        return {
                            name: isFolder ? item.slice(0, -1) : item,
                            type: isFolder ? "folder" : "file",
                        };
                    });
                    return [2 /*return*/, items];
            }
        });
    });
}
function getContentsOfFile(container, filePath) {
    return __awaiter(this, void 0, void 0, function () {
        var exec, stream, fileContent, errorOutput, stdout, stderr, inspection;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, container.exec({
                        Cmd: ["cat", filePath],
                        AttachStdout: true,
                        AttachStderr: true
                    })];
                case 1:
                    exec = _a.sent();
                    return [4 /*yield*/, exec.start({
                            hijack: true,
                            stdin: false
                        })];
                case 2:
                    stream = _a.sent();
                    fileContent = "";
                    errorOutput = "";
                    stdout = new node_stream_1.PassThrough();
                    stderr = new node_stream_1.PassThrough();
                    stdout.on("data", function (chunk) { return (fileContent += chunk.toString("utf-8")); });
                    stderr.on("data", function (chunk) { return (errorOutput += chunk.toString("utf-8")); });
                    container.modem.demuxStream(stream, stdout, stderr);
                    return [4 /*yield*/, new Promise(function (resolve) { return stream.on("end", resolve); })];
                case 3:
                    _a.sent();
                    return [4 /*yield*/, exec.inspect()];
                case 4:
                    inspection = _a.sent();
                    if (inspection.ExitCode !== 0) {
                        throw new Error("Cannot read file \"".concat(filePath, "\": ").concat(errorOutput.trim()));
                    }
                    return [2 /*return*/, fileContent];
            }
        });
    });
}
function overwriteFile(container, filePath, newCode) {
    return __awaiter(this, void 0, void 0, function () {
        var buffer, pack, normalized, parts, fileName, folderPath, entry;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    buffer = Buffer.from(newCode, "utf-8");
                    pack = tar_stream_1.default.pack();
                    normalized = filePath.startsWith("/") ? filePath : "/app/".concat(filePath);
                    parts = normalized.split("/").filter(Boolean);
                    fileName = parts.pop() || "file";
                    folderPath = "/" + parts.join("/");
                    entry = pack.entry({
                        name: fileName,
                        size: buffer.length,
                        mode: 420,
                    }, buffer);
                    pack.finalize();
                    return [4 /*yield*/, container.putArchive(pack, {
                            path: folderPath,
                        })];
                case 1:
                    _a.sent();
                    console.log(" Overwrote ".concat(folderPath, "/").concat(fileName, " with new code!"));
                    return [2 /*return*/];
            }
        });
    });
}
function pullImageFromECR(IMAGE_URI) {
    return __awaiter(this, void 0, void 0, function () {
        var ecrClient, authResponse, authData, decodedToken, _a, username, password, authConfig, stream_4, error_4;
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
                    stream_4 = _b.sent();
                    return [4 /*yield*/, new Promise(function (resolve, reject) {
                            docker.modem.followProgress(stream_4, function (err, res) { return (err ? reject(err) : resolve(res)); }, function (event) {
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
                    error_4 = _b.sent();
                    console.error("Failed to pull image:", error_4);
                    throw error_4;
                case 5: return [2 /*return*/];
            }
        });
    });
}
var wss = new ws_1.WebSocketServer({ noServer: true });
var server = http.createServer(function (req, res) {
    res.writeHead(200, { "content-type": "text/plain" });
    res.end("Http server is started before websocket conversion");
});
var authenticateUser = function (req, callback) {
    var parsedUrl = url.parse(req.url || '', true);
    var token = parsedUrl.query.token;
    // validate token 
    var secret = process.env.JWT_SECRET;
    if (!token || typeof token !== 'string' || !secret) {
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
var validChallenge = function (req, callback) { return __awaiter(void 0, void 0, void 0, function () {
    var parsedUrl, challengeId, id, challengeExist, error_5;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                parsedUrl = url.parse(req.url || "", true);
                challengeId = parsedUrl.query.challengeId;
                id = typeof challengeId === 'string' ? parseInt(challengeId, 10) : NaN;
                if (isNaN(id)) {
                    return [2 /*return*/, callback(new Error("Invalid or missing challenge id"))];
                }
                _a.label = 1;
            case 1:
                _a.trys.push([1, 3, , 4]);
                return [4 /*yield*/, prisma_1.prisma.challenges.findFirst({
                        where: {
                            id: id
                        }
                    })];
            case 2:
                challengeExist = _a.sent();
                if (!challengeExist) {
                    return [2 /*return*/, callback(new Error("No challenge exists with given challenge id"))];
                }
                return [2 /*return*/, callback(null, challengeExist)];
            case 3:
                error_5 = _a.sent();
                return [2 /*return*/, callback(new Error("Error finding challenge"))];
            case 4: return [2 /*return*/];
        }
    });
}); };
function checkImagePresent(imageName) {
    return __awaiter(this, void 0, void 0, function () {
        var image, error_6;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    image = docker.getImage(imageName);
                    return [4 /*yield*/, image.inspect()];
                case 1:
                    _a.sent();
                    return [2 /*return*/, true];
                case 2:
                    error_6 = _a.sent();
                    if ((error_6 === null || error_6 === void 0 ? void 0 : error_6.statusCode) === 404) {
                        return [2 /*return*/, false];
                    }
                    throw error_6;
                case 3: return [2 /*return*/];
            }
        });
    });
}
function getSubmission(challengeId, userId, callback) {
    return __awaiter(this, void 0, void 0, function () {
        var submission, error_7;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 4, , 5]);
                    return [4 /*yield*/, prisma_1.prisma.submissions.findFirst({
                            where: {
                                challenge_id: challengeId,
                                user_id: userId
                            }
                        })];
                case 1:
                    submission = _a.sent();
                    if (!!submission) return [3 /*break*/, 3];
                    return [4 /*yield*/, prisma_1.prisma.submissions.create({
                            data: {
                                challenge_id: challengeId,
                                user_id: userId
                            }
                        })];
                case 2:
                    submission = _a.sent();
                    _a.label = 3;
                case 3: return [2 /*return*/, callback(null, submission)];
                case 4:
                    error_7 = _a.sent();
                    return [2 /*return*/, callback(error_7)];
                case 5: return [2 /*return*/];
            }
        });
    });
}
server.on('upgrade', function (request, socket, head) {
    authenticateUser(request, function (err, user) {
        if (err || !user) {
            socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
            socket.destroy();
            return;
        }
        validChallenge(request, function (err, challenge) {
            if (err || !challenge) {
                socket.write('HTTP/1.1 400 Bad Request\r\n\r\n');
                socket.destroy();
                return;
            }
            var parsedUrl = url.parse(request.url || '', true);
            var userId = Number(user.id || user.userId || parsedUrl.query.userId);
            if (isNaN(userId)) {
                socket.write('HTTP/1.1 400 Bad Request\r\n\r\n');
                socket.destroy();
                return;
            }
            getSubmission(challenge.id, userId, function (err, submission) {
                if (err || !submission) {
                    socket.write('HTTP/1.1 500 Internal Server Error\r\n\r\n');
                    socket.destroy();
                    return;
                }
                wss.handleUpgrade(request, socket, head, function (ws) {
                    // Pass the authenticated user, challenge, and submission to the connection event
                    wss.emit('connection', ws, request, user, challenge, submission);
                });
            });
        });
    });
});
wss.on('connection', function connection(ws, request, user, challenge, submission) {
    return __awaiter(this, void 0, void 0, function () {
        var targetImage_1, imageExist, pullPromise, container_1, makeBaseAppExec, streamBase_1, exec_1, stream_5, inspection, rmExec, error_8, package_json, exec, stream_6, error_9;
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log('New WebSocket connection');
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 28, , 29]);
                    targetImage_1 = process.env.IMAGE_BASE_URL;
                    return [4 /*yield*/, checkImagePresent(targetImage_1)];
                case 2:
                    imageExist = _a.sent();
                    if (!!imageExist) return [3 /*break*/, 6];
                    if (!pullingImages.has(targetImage_1)) return [3 /*break*/, 4];
                    return [4 /*yield*/, pullingImages.get(targetImage_1)];
                case 3:
                    _a.sent();
                    return [3 /*break*/, 6];
                case 4:
                    pullPromise = pullImageFromECR(targetImage_1).finally(function () {
                        pullingImages.delete(targetImage_1);
                    });
                    pullingImages.set(targetImage_1, pullPromise);
                    return [4 /*yield*/, pullPromise];
                case 5:
                    _a.sent();
                    _a.label = 6;
                case 6: return [4 /*yield*/, docker.createContainer({
                        Image: process.env.IMAGE_BASE_URL,
                        Tty: true,
                        Cmd: ['/bin/sh'],
                        OpenStdin: true,
                        StdinOnce: false,
                        AttachStdout: true,
                        AttachStderr: true
                    })];
                case 7:
                    container_1 = _a.sent();
                    return [4 /*yield*/, container_1.start()];
                case 8:
                    _a.sent();
                    console.log("container started with container id ", container_1.id);
                    // now write the logic of fetching the code from the user s3
                    user_challenge_set.add({
                        user_id: user.id,
                        challenge_id: challenge.id,
                        docker_id: container_1.id,
                        ws: ws
                    });
                    return [4 /*yield*/, container_1.exec({
                            Cmd: ["mkdir", "-p", "/app"],
                        })];
                case 9:
                    makeBaseAppExec = _a.sent();
                    return [4 /*yield*/, makeBaseAppExec.start({})];
                case 10:
                    streamBase_1 = _a.sent();
                    return [4 /*yield*/, new Promise(function (resolve) { return streamBase_1.on("end", resolve); })];
                case 11:
                    _a.sent();
                    if (!((submission.bucket_name) && (submission.Key))) return [3 /*break*/, 22];
                    _a.label = 12;
                case 12:
                    _a.trys.push([12, 20, , 21]);
                    return [4 /*yield*/, (0, s3_1.saveS3FileToDocker)(s3_1.default, submission.bucket_name, submission.Key, container_1.id, "/app")];
                case 13:
                    _a.sent();
                    return [4 /*yield*/, container_1.exec({
                            Cmd: ["unzip", "-o", "/app/" + submission.Key, "-d", "/app"],
                            AttachStdout: true,
                            AttachStderr: true,
                        })];
                case 14:
                    exec_1 = _a.sent();
                    return [4 /*yield*/, exec_1.start({ hijack: true, stdin: false })];
                case 15:
                    stream_5 = _a.sent();
                    return [4 /*yield*/, new Promise(function (resolve, reject) {
                            container_1.modem.demuxStream(stream_5, process.stdout, process.stderr);
                            stream_5.on("end", resolve);
                            stream_5.on("error", reject);
                        })];
                case 16:
                    _a.sent();
                    return [4 /*yield*/, exec_1.inspect()];
                case 17:
                    inspection = _a.sent();
                    if (inspection.ExitCode !== 0) {
                        throw new Error("Unzip command failed with exit code ".concat(inspection.ExitCode));
                    }
                    console.log(" Files unzipped successfully!");
                    return [4 /*yield*/, container_1.exec({
                            Cmd: ["rm", "-f", "/app/" + submission.Key],
                        })];
                case 18:
                    rmExec = _a.sent();
                    return [4 /*yield*/, rmExec.start({})];
                case 19:
                    _a.sent();
                    return [3 /*break*/, 21];
                case 20:
                    error_8 = _a.sent();
                    console.log("some error occured", error_8);
                    return [3 /*break*/, 21];
                case 21: return [3 /*break*/, 25];
                case 22:
                    package_json = challenge.packages;
                    if (!!package_json) return [3 /*break*/, 23];
                    ws.send(JSON.stringify({ type: "error", message: "Please install vitest and supertest" }));
                    return [3 /*break*/, 25];
                case 23: return [4 /*yield*/, overwriteFile(container_1, "/app/package.json", package_json)];
                case 24:
                    _a.sent();
                    _a.label = 25;
                case 25: return [4 /*yield*/, container_1.exec({
                        Cmd: ['/bin/sh'],
                        AttachStdout: true,
                        AttachStderr: true,
                        AttachStdin: true,
                        Tty: true,
                        WorkingDir: "/app"
                    })];
                case 26:
                    exec = _a.sent();
                    return [4 /*yield*/, exec.start({
                            hijack: true,
                            stdin: true
                        })];
                case 27:
                    stream_6 = _a.sent();
                    stream_6.on("data", function (chunk) {
                        console.log(chunk.toString());
                        ws.send(chunk);
                    });
                    stream_6.on('end', function () {
                        console.log('Shell session ended');
                    });
                    stream_6.on('error', function (err) {
                        console.error('Stream error:', err);
                        ws.send("hello");
                    });
                    ws.on('message', function (data) { return __awaiter(_this, void 0, void 0, function () {
                        var parsed, _a, type, message, _b, cmd, _i, message_1, obj, fileExist, error_10, fileExist, fileContent, error_11, error_12, error_13, items, error_14, exec_2, stream_7, inspection, rmExec, viteExec, viteStream_1, resultsRaw, testResult, error_15;
                        return __generator(this, function (_c) {
                            switch (_c.label) {
                                case 0:
                                    try {
                                        parsed = typeof data === 'string' ? JSON.parse(data) : JSON.parse(data.toString());
                                    }
                                    catch (_d) {
                                        parsed = { type: 'terminal_command', message: typeof data === 'string' ? data : data.toString() };
                                    }
                                    _a = parsed || {}, type = _a.type, message = _a.message;
                                    _b = type;
                                    switch (_b) {
                                        case "terminal_command": return [3 /*break*/, 1];
                                        case "code_write": return [3 /*break*/, 2];
                                        case "file_code": return [3 /*break*/, 10];
                                        case "create_folder": return [3 /*break*/, 16];
                                        case "create_file": return [3 /*break*/, 22];
                                        case "get_nested_folder": return [3 /*break*/, 28];
                                        case "submit_problem": return [3 /*break*/, 34];
                                    }
                                    return [3 /*break*/, 48];
                                case 1:
                                    if (message) {
                                        cmd = typeof message === 'string' ? message : message.toString();
                                        if (!cmd.endsWith('\n')) {
                                            cmd += '\n';
                                        }
                                        console.log(cmd);
                                        stream_6.write(cmd);
                                    }
                                    return [3 /*break*/, 48];
                                case 2:
                                    // [{filePath : "App.tsx", code : "full code"}]
                                    if (!Array.isArray(message)) {
                                        ws.send(JSON.stringify({ type: "error", message: "the message must be an array of file and code" }));
                                        return [3 /*break*/, 48];
                                    }
                                    _i = 0, message_1 = message;
                                    _c.label = 3;
                                case 3:
                                    if (!(_i < message_1.length)) return [3 /*break*/, 9];
                                    obj = message_1[_i];
                                    _c.label = 4;
                                case 4:
                                    _c.trys.push([4, 7, , 8]);
                                    return [4 /*yield*/, pathExists(container_1, obj.filePath)];
                                case 5:
                                    fileExist = _c.sent();
                                    if (!fileExist) {
                                        ws.send(JSON.stringify({ type: "error", message: "Create the folder and file first for ".concat(obj.filePath) }));
                                        return [3 /*break*/, 8];
                                    }
                                    return [4 /*yield*/, overwriteFile(container_1, obj.filePath, obj.code)];
                                case 6:
                                    _c.sent();
                                    return [3 /*break*/, 8];
                                case 7:
                                    error_10 = _c.sent();
                                    console.error("Some error occurred while overwriting the code", error_10);
                                    return [3 /*break*/, 8];
                                case 8:
                                    _i++;
                                    return [3 /*break*/, 3];
                                case 9: return [3 /*break*/, 48];
                                case 10:
                                    // {filePath : "/abc/filePath.tsx"}
                                    if (!message || !message.filePath) {
                                        ws.send(JSON.stringify({ type: "error", message: "No file path is provided" }));
                                        return [3 /*break*/, 48];
                                    }
                                    _c.label = 11;
                                case 11:
                                    _c.trys.push([11, 14, , 15]);
                                    return [4 /*yield*/, pathExists(container_1, message.filePath)];
                                case 12:
                                    fileExist = _c.sent();
                                    if (!fileExist) {
                                        ws.send(JSON.stringify({ type: "error", message: "No file exists" }));
                                        return [3 /*break*/, 48];
                                    }
                                    return [4 /*yield*/, getContentsOfFile(container_1, message.filePath)];
                                case 13:
                                    fileContent = _c.sent();
                                    ws.send(JSON.stringify({ type: "file_code", filePath: message.filePath, content: fileContent }));
                                    return [3 /*break*/, 15];
                                case 14:
                                    error_11 = _c.sent();
                                    console.log("some error while fetching the file", error_11);
                                    return [3 /*break*/, 15];
                                case 15: return [3 /*break*/, 48];
                                case 16:
                                    // {path : "folder", name : "abc"}
                                    if (!message || !message.path || !message.name) {
                                        ws.send(JSON.stringify({ type: "error", message: "Invalid parameters for create_folder" }));
                                        return [3 /*break*/, 48];
                                    }
                                    return [4 /*yield*/, pathExists(container_1, message.path)];
                                case 17:
                                    // check base folder path 
                                    if (!(_c.sent())) {
                                        ws.send(JSON.stringify({ type: "error", message: "Base folder is not there, first create base folder" }));
                                        return [3 /*break*/, 48];
                                    }
                                    _c.label = 18;
                                case 18:
                                    _c.trys.push([18, 20, , 21]);
                                    return [4 /*yield*/, createFolder(container_1, message.path, message.name)];
                                case 19:
                                    _c.sent();
                                    ws.send(JSON.stringify({ type: "folder_created", path: message.path, name: message.name }));
                                    return [3 /*break*/, 21];
                                case 20:
                                    error_12 = _c.sent();
                                    console.log("Some error while creating the folder", error_12);
                                    return [3 /*break*/, 21];
                                case 21: return [3 /*break*/, 48];
                                case 22:
                                    if (!message || !message.path || !message.name) {
                                        ws.send(JSON.stringify({ type: "error", message: "Invalid parameters for create_file" }));
                                        return [3 /*break*/, 48];
                                    }
                                    return [4 /*yield*/, pathExists(container_1, message.path)];
                                case 23:
                                    // check base folder path 
                                    if (!(_c.sent())) {
                                        ws.send(JSON.stringify({ type: "error", message: "Base folder is not there, first create base folder" }));
                                        return [3 /*break*/, 48];
                                    }
                                    _c.label = 24;
                                case 24:
                                    _c.trys.push([24, 26, , 27]);
                                    return [4 /*yield*/, createFile(container_1, message.path, message.name)];
                                case 25:
                                    _c.sent();
                                    ws.send(JSON.stringify({ type: "file_created", path: message.path, name: message.name }));
                                    return [3 /*break*/, 27];
                                case 26:
                                    error_13 = _c.sent();
                                    console.log("some error while creating the file", error_13);
                                    return [3 /*break*/, 27];
                                case 27: return [3 /*break*/, 48];
                                case 28:
                                    // {folderName : abc}
                                    if (!message || !message.folderName) {
                                        ws.send(JSON.stringify({ type: "error", message: "Folder name is required" }));
                                        return [3 /*break*/, 48];
                                    }
                                    return [4 /*yield*/, pathExists(container_1, message.folderName)];
                                case 29:
                                    if (!(_c.sent())) {
                                        ws.send(JSON.stringify({ type: "error", message: "Base folder is not there" }));
                                        return [3 /*break*/, 48];
                                    }
                                    _c.label = 30;
                                case 30:
                                    _c.trys.push([30, 32, , 33]);
                                    return [4 /*yield*/, listDirectory(container_1, message.folderName)];
                                case 31:
                                    items = _c.sent();
                                    ws.send(JSON.stringify({ type: "nested_folder", folderName: message.folderName, items: items }));
                                    return [3 /*break*/, 33];
                                case 32:
                                    error_14 = _c.sent();
                                    console.log("some error in fetching", error_14);
                                    return [3 /*break*/, 33];
                                case 33: return [3 /*break*/, 48];
                                case 34:
                                    _c.trys.push([34, 46, , 47]);
                                    return [4 /*yield*/, (0, s3_1.saveS3FileToDocker)(s3_1.default, challenge.test_bucket_name, challenge.test_bucket_key, container_1.id, "/app")];
                                case 35:
                                    _c.sent();
                                    return [4 /*yield*/, container_1.exec({
                                            Cmd: ["unzip", "-o", "/app/" + challenge.test_bucket_key, "-d", "/app"],
                                            AttachStdout: true,
                                            AttachStderr: true,
                                        })];
                                case 36:
                                    exec_2 = _c.sent();
                                    return [4 /*yield*/, exec_2.start({ hijack: true, stdin: false })];
                                case 37:
                                    stream_7 = _c.sent();
                                    return [4 /*yield*/, new Promise(function (resolve, reject) {
                                            container_1.modem.demuxStream(stream_7, process.stdout, process.stderr);
                                            stream_7.on("end", resolve);
                                            stream_7.on("error", reject);
                                        })];
                                case 38:
                                    _c.sent();
                                    return [4 /*yield*/, exec_2.inspect()];
                                case 39:
                                    inspection = _c.sent();
                                    if (inspection.ExitCode !== 0) {
                                        throw new Error("Unzip command failed with exit code ".concat(inspection.ExitCode));
                                    }
                                    console.log(" Files unzipped successfully!");
                                    return [4 /*yield*/, container_1.exec({
                                            Cmd: ["rm", "-f", "/app/" + challenge.test_bucket_key],
                                        })];
                                case 40:
                                    rmExec = _c.sent();
                                    return [4 /*yield*/, rmExec.start({})];
                                case 41:
                                    _c.sent();
                                    return [4 /*yield*/, container_1.exec({
                                            Cmd: ["npx", "vitest", "run", "--reporter=json", "--outputFile=/app/test_result.json"],
                                            WorkingDir: "/app",
                                            AttachStdout: true,
                                            AttachStderr: true,
                                        })];
                                case 42:
                                    viteExec = _c.sent();
                                    return [4 /*yield*/, viteExec.start({ hijack: true, stdin: false })];
                                case 43:
                                    viteStream_1 = _c.sent();
                                    return [4 /*yield*/, new Promise(function (resolve, reject) {
                                            container_1.modem.demuxStream(viteStream_1, process.stdout, process.stderr);
                                            viteStream_1.on("end", resolve);
                                            viteStream_1.on("error", reject);
                                        })];
                                case 44:
                                    _c.sent();
                                    return [4 /*yield*/, getContentsOfFile(container_1, "/app/test_result.json")];
                                case 45:
                                    resultsRaw = _c.sent();
                                    testResult = JSON.parse(resultsRaw);
                                    console.log("Test results parsed successfully:", testResult);
                                    ws.send(JSON.stringify({ type: "test_result", data: testResult }));
                                    return [3 /*break*/, 47];
                                case 46:
                                    error_15 = _c.sent();
                                    console.log("some error", error_15);
                                    ws.send(JSON.stringify({ type: "error", message: "Failed to run submission tests" }));
                                    return [3 /*break*/, 47];
                                case 47: return [3 /*break*/, 48];
                                case 48: return [2 /*return*/];
                            }
                        });
                    }); });
                    ws.on('error', console.error);
                    stream_6.on('error', console.error);
                    ws.on('close', function () { return __awaiter(_this, void 0, void 0, function () {
                        var info, err_1;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    try {
                                        stream_6.end();
                                    }
                                    catch (_b) { }
                                    _a.label = 1;
                                case 1:
                                    _a.trys.push([1, 7, , 8]);
                                    return [4 /*yield*/, container_1.inspect()];
                                case 2:
                                    info = _a.sent();
                                    if (!info.State.Running) return [3 /*break*/, 4];
                                    return [4 /*yield*/, container_1.kill()];
                                case 3:
                                    _a.sent();
                                    console.log("Container with container id : " + container_1.id + " killed");
                                    return [3 /*break*/, 5];
                                case 4:
                                    console.log("Container with container id : " + container_1.id + " already killed");
                                    _a.label = 5;
                                case 5: return [4 /*yield*/, container_1.remove({ force: true }).catch(function () { })];
                                case 6:
                                    _a.sent();
                                    return [3 /*break*/, 8];
                                case 7:
                                    err_1 = _a.sent();
                                    console.error("Error cleaning up container:", err_1);
                                    return [3 /*break*/, 8];
                                case 8:
                                    user_challenge_set.forEach(function (item) {
                                        if (item.ws === ws) {
                                            user_challenge_set.delete(item);
                                        }
                                    });
                                    return [2 /*return*/];
                            }
                        });
                    }); });
                    return [3 /*break*/, 29];
                case 28:
                    error_9 = _a.sent();
                    console.error(error_9);
                    ws.send('Error: ' + error_9.message);
                    ws.close();
                    return [3 /*break*/, 29];
                case 29: return [2 /*return*/];
            }
        });
    });
});
server.listen(8080, function () {
    console.log('Server is listening on http://localhost:8080');
});
