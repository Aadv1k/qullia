import http from "node:http";
import { sendJsonResponse, md5 } from "../common/utils";
import Token from "../lib/GenerateToken";
import { ERROR } from "../common/const";
import UserModel from "../models/UserModel";
import { User } from "../common/types";

const DB = new UserModel();

export default async function (
  req: http.IncomingMessage,
  res: http.ServerResponse
) {
  let data: string;

  try {
    data = await new Promise((resolve, reject) => {
      let rawData: string = "";
      req.on("data", (chunk: string) => (rawData += chunk));
      req.on("end", () => resolve(rawData));
      req.on("error", reject);
    });
  } catch (error) {
    console.error(error);
    sendJsonResponse(res, ERROR.internalErr)
    return;
  }


  if (req.method !== "POST") {
    sendJsonResponse(res, ERROR.methodNotAllowed, 405);
    return;
  }

  let parsedData: User;

  try {
    parsedData = JSON.parse(data === "" ? '{}' : data);
  } catch(error) {
    sendJsonResponse(res, ERROR.invalidJSONData, 400)
    return;
  }

  DB.init();

  const foundUser: User = await DB.getUser(parsedData.email);

  if (!foundUser) {
    sendJsonResponse(res, ERROR.userNotFound, 404);
    return;
  }

  if (md5(parsedData.password) !== foundUser.password) {
    sendJsonResponse(res, ERROR.unauthorized, 401);
    return;
  }

  const token = new Token();
  const { password, ...tokenBody} = foundUser;
  let accessToken = token.generate(tokenBody);

  sendJsonResponse(res, {
    messaged: "found the given user",
    status: 200,
    error: null,
    token: accessToken,
  }, 200)

  DB.close();
}
