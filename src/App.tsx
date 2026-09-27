import { useEffect, useState } from "react";
import { useRecognition, rememberedTaskId } from "./hooks/useRecognition";
import { Home } from "./pages/Home";
import { Results } from "./pages/Results";
import { Scan } from "./pages/Scan";

type Page = "home" | "scan" | "results";
export default function App() {
  const recognition = useRecognition();
  const [page, setPage] = useState<Page>(() =>
    rememberedTaskId() ? "results" : "home",
  );
  useEffect(() => {
    const id = rememberedTaskId();
    if (id) void recognition.run(undefined, id);
    // Run once per app mount. StrictMode may repeat in development; run aborts
    // any previous poll before starting the next.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const scanAgain = () => {
    recognition.cancel();
    setPage("scan");
  };
  const home = () => {
    recognition.cancel();
    setPage("home");
  };
  if (page === "scan")
    return (
      <Scan
        onBack={home}
        onReady={(file) => {
          setPage("results");
          void recognition.run(file);
        }}
      />
    );
  if (page === "results")
    return (
      <Results
        view={recognition.view}
        taskId={recognition.taskId}
        uploadedImageId={recognition.uploadedImageId}
        result={recognition.result}
        error={recognition.error}
        onRetry={() => {
          if (recognition.taskId)
            void recognition.run(undefined, recognition.taskId);
        }}
        onHome={home}
        onScanAgain={scanAgain}
      />
    );
  return <Home onScan={() => setPage("scan")} />;
}
