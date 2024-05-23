export type TodoItem = {
  id: number;
  title: string;
  description: string;
  completed: boolean;
  updated_at: string;
  created_at: string;
};

export type APICrudReadParams = {
  action: "read";
};
