import { slugify } from "@/src/utils";

type TodoListItem = {
  id: number;
  title: string;
  isCompleted: boolean;
  description?: string;
};

const mockTodoListItems: TodoListItem[] = [
  {
    id: 1,
    title: "Buy milk",
    isCompleted: false,
    description: "Make sure it's organic 2%",
  },
  {
    id: 2,
    title: "Buy eggs",
    isCompleted: true,
  },
  {
    id: 3,
    title: "Buy bread",
    isCompleted: false,
  },
];

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="flex max-w-4xl flex-col items-start justify-center gap-x-4">
        <div className="flex flex-col items-start justify-start w-full">
          <div className="text-5xl font-bold text-left pb-8 w-full">
            Todo 📝
          </div>
          <button className="btn btn-lg btn-primary mb-8">+ Add Todo</button>
        </div>

        <div className="flex gap-4 w-full items-start justify-start flex-row flex-wrap">
          {mockTodoListItems.map((item) => (
            <div key={item.id} className="card w-96 bg-base-100 shadow-xl">
              <figure>
                <img
                  src={`https://avatar.vercel.sh/todo-${slugify(item.title)}`}
                  alt="todo-image"
                  className="w-full object-cover h-48"
                />
              </figure>
              <div className="card-body">
                <h2 className="card-title">{item.title}</h2>
                {item?.description && <p>{item.description}</p>}
                <div className="card-actions justify-end gap-2 pt-2">
                  <button className="btn btn-secondary">Remove</button>
                  <button className="btn btn-primary">Done</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
