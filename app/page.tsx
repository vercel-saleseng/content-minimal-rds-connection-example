import { Todo } from "@/src/components/todo";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="flex max-w-4xl flex-col items-start justify-center gap-x-4">
        <div className="flex flex-col items-start justify-start w-full">
          <div className="text-5xl font-bold text-left pb-8 w-full">
            Todo 📝
          </div>
        </div>
        <Todo />
      </div>
    </main>
  );
}
