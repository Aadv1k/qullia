import IssueModel from "../models/IssueModel";
import BookModel from "../models/BookModel";
import UserModel from "../models/UserModel";

import Token from "../lib/GenerateToken";
import { ERROR } from "../common/const";
import { TokStatus, Issue } from "../common/types";
import { sendJsonResponse, parseSimplePostData, uuid } from "../common/utils";

import http from "node:http";

export default async function (
  req: http.IncomingMessage,
  res: http.ServerResponse
) {
  const ISSUE_DB = new IssueModel();
  const BOOK_DB = new BookModel();
  const USER_DB = new UserModel();
  const authorization = req.headers?.authorization;
  const authToken = authorization?.split(" ")?.pop()?.trim();

  if (!authorization || !authToken) {
    sendJsonResponse(res, ERROR.unauthorized, 401);
    return;
  }

  const token = new Token();
  const tokenStatus: TokStatus = token.verify(authToken);
  
  if (
    tokenStatus === TokStatus.INVALID ||
    tokenStatus === TokStatus.INVALID_SIG
  ) {
    sendJsonResponse(res, ERROR.unauthorized, 401);
    return;
  }
 
  const parsedAuthToken: any = token.UNSAFE_parse(authToken);
  await USER_DB.init();

  if (req.method === "GET") {
    let URLparams = req.url.split('/').slice(3);
    let requestedIssue = URLparams?.[0];

    await ISSUE_DB.init();
    await BOOK_DB.init();

    if (requestedIssue) {
      console.log(Buffer.from(requestedIssue).toString("base64"));
      let targetIssue = await ISSUE_DB.getIssue(null, requestedIssue, parsedAuthToken.id);

      if (!targetIssue) {
        sendJsonResponse(res, ERROR.resourceNotExists, 404);
      } else {
        let bookid = targetIssue.bookid;
        let targetBook = await BOOK_DB.getBook(bookid);
        sendJsonResponse(res, targetBook, 200);
      }

      await ISSUE_DB.close();
      await BOOK_DB.close();
      return;
    }

    let userIssues = await ISSUE_DB.getIssues(parsedAuthToken.id);

    if (!userIssues || userIssues.length === 0) {
      sendJsonResponse(res, ERROR.resourceNotExists, 404);
    } else {
      sendJsonResponse(res, userIssues, 200);
    }

    await ISSUE_DB.close();

  } else if (req.method === "POST") {
    if (req.headers?.["content-type"] != "application/json") {
      sendJsonResponse(res, ERROR.invalidMimeForResource, 415);
      return;
    }

    let issueData: Issue;

    try {
      let issuePostData = await parseSimplePostData(req);
      issueData = JSON.parse(issuePostData.toString());
    } catch (error) {
      console.error(error);
      sendJsonResponse(res, ERROR.badRequest, 400)
      return;
    }

    if (!issueData.borrowerid || !issueData.bookid) {
      sendJsonResponse(res, ERROR.badRequest, 400)
      return;
    }

    let foundBorrower = await USER_DB.getUser("", issueData.borrowerid);
    let foundBook = await BOOK_DB.getBook(issueData.bookid);

    if (!foundBorrower || !foundBook) {
      sendJsonResponse(res, ERROR.resourceNotExists, 404)
      return;
    }
    let foundIssue = await ISSUE_DB.getIssue(parsedAuthToken.id);

    if (foundIssue) {
      sendJsonResponse(
        res,
        {
          ...ERROR.resourceExists,
          data: {
            id: foundIssue.id,
          },
        },
        409
      );
      return;
    }

    let issueid = uuid();

    let issueEntry: Issue = { 
      id: issueid,
      borrowerid: foundBorrower.id,
      lenderid: parsedAuthToken.id,
      bookid: foundBook.id
    }

    const pushed = await ISSUE_DB.pushIssue(issueEntry);

    if (!pushed) {
      sendJsonResponse(res, ERROR.internalErr, 500);
      return;
    }

    sendJsonResponse(
      res,
      {
        error: null,
        message: `successfully created a new issue of id ${issueEntry.id}`,
        data: {
          id: pushed.id,
          borrower: pushed.borrowerid,
          book: foundBook.title,
        },
      },
      201
    );
  }

 await ISSUE_DB.close();
 await BOOK_DB.close();
 await USER_DB.close();
}
