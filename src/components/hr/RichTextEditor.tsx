"use client";

import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  AlignCenter,
  AlignLeft,
  Bold,
  Italic,
  Link2,
  List,
  ListOrdered,
  Redo2,
  Strikethrough,
  Underline as UnderlineIcon,
  Undo2,
} from "lucide-react";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { descriptionToEditorHtml } from "@/lib/job-description-html";

type Props = {
  name?: string;
  defaultValue?: string;
  placeholder?: string;
  minHeight?: string;
};

function ToolbarButton({
  onClick,
  active,
  disabled,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`flex h-8 w-8 items-center justify-center rounded-md transition-colors disabled:opacity-40 ${
        active ? "bg-kastros-forest text-white" : "text-kastros-forest hover:bg-kastros-cream"
      }`}
    >
      {children}
    </button>
  );
}

function ToolbarDivider() {
  return <span className="mx-0.5 h-6 w-px bg-kastros-sand" aria-hidden />;
}

export function RichTextEditor({
  name = "description",
  defaultValue = "",
  placeholder = "Write the job description — format like a document…",
  minHeight = "220px",
}: Props) {
  const initialHtml = descriptionToEditorHtml(defaultValue);
  const [html, setHtml] = useState(initialHtml);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
      }),
      Placeholder.configure({ placeholder }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
    ],
    content: initialHtml,
    editorProps: {
      attributes: {
        class: "rich-editor-prose min-h-[180px] px-4 py-3 text-sm leading-relaxed text-kastros-ink outline-none",
        style: `min-height: ${minHeight}`,
      },
    },
    onUpdate: ({ editor: ed }) => {
      const next = ed.getHTML();
      setHtml(next === "<p></p>" ? "" : next);
    },
  });

  useEffect(() => {
    if (!editor) return;
    const next = descriptionToEditorHtml(defaultValue);
    if (next !== editor.getHTML()) {
      editor.commands.setContent(next || "", { emitUpdate: false });
      setHtml(next);
    }
  }, [defaultValue, editor]);

  const setLink = useCallback(() => {
    if (!editor) return;
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link URL", prev ?? "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }, [editor]);

  if (!editor) {
    return (
      <div
        className="rounded-xl border border-kastros-sand bg-white animate-pulse"
        style={{ minHeight }}
        aria-hidden
      />
    );
  }

  const icon = 16;

  return (
    <div className="rich-text-editor overflow-hidden rounded-xl border border-kastros-sand bg-white shadow-sm">
      <div className="flex flex-wrap items-center gap-0.5 border-b border-kastros-sand bg-kastros-cream/50 px-2 py-1.5">
        <ToolbarButton
          title="Bold"
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold size={icon} strokeWidth={2.25} />
        </ToolbarButton>
        <ToolbarButton
          title="Italic"
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic size={icon} strokeWidth={2.25} />
        </ToolbarButton>
        <ToolbarButton
          title="Underline"
          active={editor.isActive("underline")}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <UnderlineIcon size={icon} strokeWidth={2.25} />
        </ToolbarButton>
        <ToolbarButton
          title="Strikethrough"
          active={editor.isActive("strike")}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        >
          <Strikethrough size={icon} strokeWidth={2.25} />
        </ToolbarButton>

        <ToolbarDivider />

        <select
          title="Text style"
          className="h-8 max-w-[7.5rem] rounded-md border border-kastros-sand bg-white px-2 text-xs font-medium text-kastros-forest"
          value={
            editor.isActive("heading", { level: 2 })
              ? "h2"
              : editor.isActive("heading", { level: 3 })
                ? "h3"
                : "p"
          }
          onChange={(e) => {
            const v = e.target.value;
            if (v === "h2") editor.chain().focus().toggleHeading({ level: 2 }).run();
            else if (v === "h3") editor.chain().focus().toggleHeading({ level: 3 }).run();
            else editor.chain().focus().setParagraph().run();
          }}
        >
          <option value="p">Normal</option>
          <option value="h2">Heading</option>
          <option value="h3">Subheading</option>
        </select>

        <ToolbarDivider />

        <ToolbarButton
          title="Bullet list"
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List size={icon} strokeWidth={2.25} />
        </ToolbarButton>
        <ToolbarButton
          title="Numbered list"
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered size={icon} strokeWidth={2.25} />
        </ToolbarButton>

        <ToolbarDivider />

        <ToolbarButton
          title="Align left"
          active={editor.isActive({ textAlign: "left" })}
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
        >
          <AlignLeft size={icon} strokeWidth={2.25} />
        </ToolbarButton>
        <ToolbarButton
          title="Align center"
          active={editor.isActive({ textAlign: "center" })}
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
        >
          <AlignCenter size={icon} strokeWidth={2.25} />
        </ToolbarButton>

        <ToolbarButton title="Insert link" active={editor.isActive("link")} onClick={setLink}>
          <Link2 size={icon} strokeWidth={2.25} />
        </ToolbarButton>

        <ToolbarDivider />

        <ToolbarButton title="Undo" disabled={!editor.can().undo()} onClick={() => editor.chain().focus().undo().run()}>
          <Undo2 size={icon} strokeWidth={2.25} />
        </ToolbarButton>
        <ToolbarButton title="Redo" disabled={!editor.can().redo()} onClick={() => editor.chain().focus().redo().run()}>
          <Redo2 size={icon} strokeWidth={2.25} />
        </ToolbarButton>
      </div>

      <EditorContent editor={editor} />

      <input type="hidden" name={name} value={html} readOnly />
    </div>
  );
}
