import { Handler } from "aws-lambda";
import { Client } from "pg";
import {
  APICrudCreateParams,
  APICrudReadParams,
  APICrudUpdateParams,
  TodoItem,
} from "../../lib/types";

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
  let payload:
    | APICrudReadParams
    | APICrudCreateParams
    | APICrudUpdateParams
    | null = null;

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

  switch (action) {
    case "read":
    case "create":
    case "update":
      break;
    default:
      const _exhaustiveCheck: never = action; // TypeScript check to catch missing cases
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: `Bad Request: Unknown action ${action}`,
        }),
      };
  }

  try {
    const client = new Client(dbConfig);
    await client.connect();

    let result = null;

    if (action === "read") {
      result = await client.query<TodoItem>(
        "SELECT * FROM todo WHERE deleted_at IS NULL AND completed = false",
      );
    }

    if (action === "create") {
      const { title, description, completed } = payload as APICrudCreateParams;
      result = await client.query<TodoItem>(
        "INSERT INTO todo (title, description, completed) VALUES ($1, $2, $3) RETURNING *",
        [title, description, completed],
      );
    }

    if (action === "update") {
      const { id } = payload as APICrudUpdateParams;
      const updatedFields = Object.keys(payload as APICrudUpdateParams).filter(
        (key) => key !== "action" && key !== "id",
      );
      const updates = [];
      const values: any[] = [];

      for (const field of updatedFields) {
        updates.push(`${field} = $${values.length + 1}`);
        values.push((payload as any)[field]);
      }

      result = await client.query<TodoItem>(
        `UPDATE todo SET ${updates.join(", ")} WHERE id = ${id} RETURNING *`,
        values,
      );
    }

    if (!result) {
      throw new Error("Unable to process request");
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
