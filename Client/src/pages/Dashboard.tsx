export function Dashboard() {
    return (
      <section>
        <p className="text-sm text-zinc-500">Good to see you.</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">
          Today’s training
        </h1>
  
        <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <p className="text-sm text-zinc-500">Workout</p>
          <h2 className="mt-1 text-xl font-semibold">Your workout is coming.</h2>
          <p className="mt-2 text-zinc-400">
            We'll connect this screen to your real workout data next.
          </p>
        </div>
      </section>
    );
  }