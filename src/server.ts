import http from "node:http";
import { sendPublicFile } from "./common/utils";
import RouteSignup from "./routes/Signup"

export default http.createServer( async (req: http.IncomingMessage, res: http.ServerResponse) => {
  const url: string  = req.url;
  if (url === "/") {
    sendPublicFile(res, "index.html");
  } else if (url.startsWith("/api/signup")) {
    await RouteSignup(req, res);
  }
  res.end();
})
