import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-white group-[.toaster]:text-foreground group-[.toaster]:border group-[.toaster]:border-gray-200 group-[.toaster]:shadow-md",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-yellow-400 group-[.toast]:text-black group-[.toast]:hover:bg-yellow-500",
          cancelButton: "group-[.toast]:border group-[.toast]:border-gray-300 group-[.toast]:bg-white group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
