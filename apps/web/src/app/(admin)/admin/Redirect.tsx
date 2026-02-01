"use client";

import { useEffect, useState } from "react";

import { doctor } from "@/actions/doctor";
import MainLayout from "@/components/client/layout/MainLayout";
import { useNavigateWithTransition } from "@/components/ui/Link";
import { useMobile } from "@/hooks/use-mobile";
import { AutoTransition } from "@/ui/AutoTransition";

export default function AdminRedirect() {
  const [title, setTitle] = useState("正在启动管理仪表盘...");
  const navigate = useNavigateWithTransition();
  const isMobile = useMobile();

  useEffect(() => {
    doctor({ force: false }).then(() => {
      const role = JSON.parse(localStorage.getItem("user_info") || "{}").role;
      if (role === "ADMIN") setTitle("正在导航至仪表盘...");
      else setTitle("正在导航至内容管理中心...");
      setTimeout(() => {
        if (role === "ADMIN") navigate("/admin/dashboard");
        else navigate("/admin/posts");
      }, 1000);
    });
  });
  return (
    <MainLayout type="horizontal">
      <div className="w-full h-full min-h-[70vh] flex justify-center items-center flex-col gap-4">
        <div>
          {isMobile ? (
            <>
              <h1 className="text-6xl">
                NeutralPress <br /> Admin Panel
              </h1>{" "}
              <br />
            </>
          ) : (
            <h1 className="text-6xl">NeutralPress Admin Panel</h1>
          )}
        </div>
        <div className="text-2xl">
          <AutoTransition>{title}</AutoTransition>
        </div>
      </div>
    </MainLayout>
  );
}
