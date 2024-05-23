export type TodoItem = {
  id: number;
  title: string;
  description?: string | null;
  completed: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type APICrudReadParams = {
  action: "read";
};

export type APICrudCreateParams = Omit<
  TodoItem,
  "id" | "updated_at" | "created_at" | "deleted_at"
> & {
  action: "create";
};

export type APICrudUpdateParams = Partial<
  Omit<TodoItem, "created_at" | "updated_at">
> & {
  action: "update";
  id: TodoItem["id"];
};
