/** Renders model answers as React elements instead of injected HTML. */

"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function Markdown({ children }: { children: string }) {
  return (
    <div className="flex flex-col gap-3 leading-relaxed">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: (props) => <p className="text-[15px]" {...props} />,
          strong: (props) => <strong className="font-semibold text-stone-900 dark:text-stone-50" {...props} />,
          em: (props) => <em className="text-stone-700 dark:text-stone-300" {...props} />,
          ul: (props) => <ul className="ml-1 flex flex-col gap-1.5 text-[15px]" {...props} />,
          ol: (props) => <ol className="ml-1 flex list-decimal flex-col gap-1.5 pl-4 text-[15px]" {...props} />,
          li: ({ children, ...rest }) => (
            <li className="relative pl-4 before:absolute before:left-0 before:text-stone-400
                           before:content-['·'] [&>ul]:mt-1.5 [&>ul]:pl-2" {...rest}>
              {children}
            </li>
          ),
          h1: (props) => <h3 className="mt-1 font-semibold" {...props} />,
          h2: (props) => <h3 className="mt-1 font-semibold" {...props} />,
          h3: (props) => <h3 className="mt-1 font-semibold" {...props} />,
          hr: () => <hr className="border-stone-200 dark:border-stone-800" />,
          code: (props) => (
            <code className="rounded bg-stone-100 px-1 py-0.5 font-mono text-[13px]
                             dark:bg-stone-800" {...props} />
          ),
          a: (props) => <a className="underline decoration-stone-400" {...props} />,
          table: (props) => (
            <div className="overflow-x-auto">
              <table className="text-[14px]" {...props} />
            </div>
          ),
          th: (props) => <th className="border-b border-stone-300 px-2 py-1 text-left
                                        dark:border-stone-700" {...props} />,
          td: (props) => <td className="border-b border-stone-100 px-2 py-1
                                        dark:border-stone-800" {...props} />,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
