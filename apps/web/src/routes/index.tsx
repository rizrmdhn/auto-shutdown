import { Button } from "@/components/ui/button";
import { globalSuccessToast } from "@/lib/toast";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div>
      <Button onClick={() => globalSuccessToast("hello there this is toast")}>
        Go to about
      </Button>
    </div>
  );
}
