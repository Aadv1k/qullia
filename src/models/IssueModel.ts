import { Client } from "pg";
import { DB as DBConfig } from "../common/const";
import { Issue } from "../common/types";

export default class IssueModel {
  private readonly client: Client;

  constructor() {
    this.client = new Client({
      user: DBConfig.USER,
      host: DBConfig.HOST,
      database: DBConfig.DB_NAME,
      password: DBConfig.PASSWORD,
      port: DBConfig.PORT,
      ssl: true,
    });
  }

  async init(): Promise<void> {
    try {
      await this.client.connect();
      await this.client.query(`
        CREATE TABLE IF NOT EXISTS issues (
         id UUID NOT NULL,
         lenderid UUID NOT NULL,
         borrowerid UUID NOT NULL,
         bookid UUID NOT NULL
        )
        `);
    } catch (error) {
      console.error(error);
    }
  }

  async issueExists(issueid: string): Promise<boolean> {
    const result = await this.client.query("SELECT EXISTS (SELECT 1 FROM issues WHERE id = $1)", [issueid])
    return result.rows[0].exists
  } 

  async pushIssue(data: Issue): Promise<Issue | null> {
    try {
      await this.client.query(
        "INSERT INTO issues (id, lenderid, borrowerid, bookid) VALUES ($1 $2 $3 $4)",
        [data.id, data.lenderid, data.borrowerid, data.bookid]
      );
      return data;
    } catch (error) {
      console.error(error);
      return null;
    }
  }

  async removeIssue(
    issueid: string,
    borrowerid?: string,
    lenderid?: string
  ): Promise<void | null> {
    try {
      await this.client.query(
        "DELETE FROM issues WHERE issueid = $1 OR borrowerid = $2 OR lenderid = $3",
        [issueid ?? "", borrowerid ?? "", lenderid ?? ""]
      );
    } catch (error) {
      console.error(error);
      return null;
    }
  }

  async getIssues(borrowerid: string): Promise<Array<Issue> | null> {
    try {
      let response = await this.client.query(
        "SELECT * FROM issues WHERE borrowerid = $1",
        [borrowerid]
      );

      return response.rows;
    } catch (error) {
      console.error(error);
      return null;
    }

  }

  async getIssue(
    issueid: string,
    borrowerid?: string,
    lenderid?: string
  ): Promise<Issue | null> {
    try {
      let response = await this.client.query(
        "SELECT * FROM issues WHERE issueid = $1 OR borrowerid = $2 OR lenderid = $3",
        [issueid ?? "", borrowerid ?? "", lenderid ?? ""]
      );
      return response.rows[0];
    } catch (error) {
      console.error(error);
      return null;
    }
  }

  async close(): Promise<void> {
    await this.client.end();
  }
}
