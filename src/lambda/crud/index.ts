import { Handler } from "aws-lambda";
import { Client } from "pg";
import { APICrudReadParams, TodoItem } from "../../lib/types";

const dbConfig = {
  user: process.env.DB_USERNAME,
  host: process.env.RDS_PROXY_ENDPOINT,
  database: "todo",
  password: process.env.DB_PASSWORD,
  port: 5432,
  ssl: {
    rejectUnauthorized: false,
  },
};

export const handler: Handler = async (event) => {
  let payload: APICrudReadParams | null = null;
  if (event?.body) {
    payload = JSON.parse(event.body);
  } else {
    payload = event;
  }
  console.log("payload", JSON.stringify(payload, null, 2));
  const action = payload?.action;
  if (!action) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        message: "Bad Request: Missing action parameter",
      }),
    };
  }

  try {
    const client = new Client(dbConfig);
    await client.connect();

    let result = null;

    switch (action) {
      case "read":
        result = await client.query<TodoItem>("SELECT * FROM todo");
        break;
      default:
        const _exhaustiveCheck: never = action;
        return {
          statusCode: 400,
          body: JSON.stringify({
            message: `Bad Request: Unknown action ${action}`,
          }),
        };
    }

    console.log(result.rows);
    return {
      statusCode: 200,
      body: JSON.stringify(result.rows),
    };
  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: `Internal Server Error: ${JSON.stringify(error)}`,
      }),
    };
  }
};
