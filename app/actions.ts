"use server";
import {
  APICrudCreateParams,
  APICrudReadParams,
  APICrudUpdateParams,
  TodoItem,
} from "@/src/lib/types";

const apiUrl = (path: string) => `${process.env.API_URL}${path}`;

export const readTodos = async (url: string) => {
  const params: APICrudReadParams = {
    action: "read",
  };
  const response = await fetch(apiUrl(url), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(params),
  });

  const data = (await response.json()) as TodoItem[];
  return data;
};

export const putTodo = async (
  url: string,
  { arg }: { arg: APICrudCreateParams | APICrudUpdateParams },
) => {
  const response = await fetch(apiUrl(url), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(arg),
  });

  const data = (await response.json()) as TodoItem[];
  return data;
};
