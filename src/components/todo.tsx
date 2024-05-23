"use client";
import useSWR, { mutate } from "swr";
import useSWRMutation from "swr/mutation";
import {
  APICrudCreateParams,
  APICrudReadParams,
  APICrudUpdateParams,
  TodoItem,
} from "../lib/types";
import { cn } from "../utils";
import { useState } from "react";

const CREATE_MODAL_ID = "create_modal";

const readTodos = async (url: string) => {
  const params: APICrudReadParams = {
    action: "read",
  };
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(params),
  });

  const data = await response.json();
  return data;
};

const putTodo = async (
  url: string,
  { arg }: { arg: APICrudCreateParams | APICrudUpdateParams },
) => {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(arg),
  });

  const data = await response.json();
  return data;
};

export const Todo = () => {
  const { data: todoData, isLoading } = useSWR<TodoItem[]>(
    `${process.env.NEXT_PUBLIC_API_URL}/crud`,
    readTodos,
  );

  const { trigger: triggerCreate, isMutating: isCreating } = useSWRMutation(
    `${process.env.NEXT_PUBLIC_API_URL}/crud`,
    putTodo,
  );

  const { trigger: triggerDelete, isMutating: isDeleting } = useSWRMutation(
    `${process.env.NEXT_PUBLIC_API_URL}/crud`,
    putTodo,
  );

  const { trigger: triggerComplete, isMutating: isCompleting } = useSWRMutation(
    `${process.env.NEXT_PUBLIC_API_URL}/crud`,
    putTodo,
  );

  const [createTodoForm, setCreateTodoForm] = useState<
    Omit<APICrudCreateParams, "action">
  >({
    title: "",
    description: "",
    completed: false,
  });

  const setCreateTodoFormValue = (key: string, value: string) => {
    setCreateTodoForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const createTodo = async () => {
    await triggerCreate({
      action: "create",
      ...createTodoForm,
    });
    mutate(`${process.env.NEXT_PUBLIC_API_URL}/crud`);
    setCreateTodoForm({
      title: "",
      description: "",
      completed: false,
    });

    (document.getElementById(CREATE_MODAL_ID) as any).close();
  };

  const deleteTodo = async (id: number) => {
    await triggerDelete({
      action: "update",
      id,
      deleted_at: new Date().toISOString(),
    });
  };

  const completeTodo = async (id: number) => {
    await triggerComplete({
      action: "update",
      id,
      completed: true,
    });
  };

  return (
    <div className="flex max-w-4xl flex-col items-start justify-center gap-x-4">
      <div className="flex flex-col items-start justify-start w-full">
        <button
          className="btn mb-8"
          onClick={() =>
            (document.getElementById(CREATE_MODAL_ID) as any).showModal()
          }
        >
          + Add Todo
        </button>
        <dialog id={CREATE_MODAL_ID} className="modal">
          <div className="modal-box">
            <h3 className="font-bold text-lg">Add Todo!</h3>
            <p className="pt-2 pb-4 text-sm">
              Press ESC key or click the button below to close
            </p>
            <div className="w-full flex flex-col items-center justify-center gap-y-2">
              <input
                type="text"
                className="input input-bordered w-full"
                placeholder="Title"
                value={createTodoForm.title}
                onChange={(e) =>
                  setCreateTodoFormValue("title", e.target.value)
                }
              />
              <textarea
                className="textarea textarea-bordered w-full mt-4"
                placeholder="Description"
                value={createTodoForm?.description || ""}
                onChange={(e) =>
                  setCreateTodoFormValue("description", e.target.value)
                }
              ></textarea>
            </div>
            <div className="modal-action">
              <form method="dialog">
                {/* if there is a button in form, it will close the modal */}
                <button className="btn">Cancel</button>
              </form>

              <button
                disabled={isCreating}
                className={cn(
                  "btn btn-primary",
                  isCreating ? "btn-disabled" : "",
                )}
                onClick={createTodo}
              >
                Create
              </button>
            </div>
          </div>
        </dialog>
      </div>

      <div className="flex gap-4 w-full items-start justify-start flex-row flex-wrap">
        {isLoading && (
          <span className="loading loading-spinner loading-lg"></span>
        )}
        {(todoData ?? []).map((item) => (
          <div key={item.id} className="card w-96 bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title">{item.title}</h2>
              {item?.description && <p>{item.description}</p>}
              <div className="card-actions justify-end gap-2 pt-2">
                <button
                  disabled={isDeleting}
                  className={cn(
                    "btn btn-secondary",
                    isDeleting ? "btn-disabled" : "",
                  )}
                  onClick={() => deleteTodo(item.id)}
                >
                  Remove
                </button>
                <button
                  disabled={isCompleting}
                  className={cn(
                    "btn btn-primary",
                    isCompleting ? "btn-disabled" : "",
                  )}
                  onClick={() => completeTodo(item.id)}
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
