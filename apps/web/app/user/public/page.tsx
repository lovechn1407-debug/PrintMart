import { redirect } from "next/navigation";

export default function UserPublicRedirect() {
  redirect("/public");
}

