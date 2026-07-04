// "use client";

// import {
//   Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupLabel,
//   SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
// } from "@/components/ui/sidebar";
// import { Zap, Trophy, Clock, Settings, Home, Users } from "lucide-react";
// import Link from "next/link";
// import { usePathname } from "next/navigation";
// import { useUser } from "@clerk/nextjs";

// const NAV_ITEMS = [
//   { href: "/dashboard",   label: "My Den",          icon: Home },
//   { href: "/lobby",       label: "Office Lobby",    icon: Users },
//   { href: "/leaderboard", label: "Chaos Rankings",  icon: Trophy },
//   { href: "/history",     label: "Incident Reports",icon: Clock },
//   { href: "/settings",    label: "Settings",        icon: Settings },
// ];

// export function AppSidebar() {
//   const { user } = useUser();
//   const pathname = usePathname();

//   return (
//     <Sidebar>
//       <SidebarHeader>
//         <div className="flex items-center gap-2 px-3 py-3">
//           <span className="text-2xl">🟢</span>
//           <div>
//             <p className="text-sm font-black text-black dark:text-white">
//               <span className="text-red-500">GREMLIN</span> <span className="text-green-500">INC.</span>
//             </p>
//             <p className="text-[10px] text-gray-400">Chaos Management System</p>
//           </div>
//         </div>
//       </SidebarHeader>

//       <SidebarContent>
//         <SidebarGroup>
//           <SidebarGroupLabel>Navigation</SidebarGroupLabel>
//           <SidebarMenu>
//             {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
//               <SidebarMenuItem key={href}>
//                 <SidebarMenuButton asChild isActive={pathname === href}>
//                   <Link href={href} className="flex items-center gap-2">
//                     <Icon size={16} />
//                     <span>{label}</span>
//                   </Link>
//                 </SidebarMenuButton>
//               </SidebarMenuItem>
//             ))}
//           </SidebarMenu>
//         </SidebarGroup>
//       </SidebarContent>

//       <SidebarFooter>
//         {user && (
//           <div className="px-3 py-2 border-t border-gray-200 dark:border-gray-800">
//             <div className="flex items-center gap-2">
//               <div className="w-7 h-7 rounded-full bg-green-700 flex items-center justify-center text-sm">🟢</div>
//               <div className="min-w-0">
//                 <p className="text-xs font-semibold text-black dark:text-white truncate">{user.fullName ?? user.username}</p>
//                 <p className="text-[10px] text-gray-400 truncate">{user.primaryEmailAddress?.emailAddress}</p>
//               </div>
//             </div>
//           </div>
//         )}
//       </SidebarFooter>
//     </Sidebar>
//   );
// }

"use client";

import { useState } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Trophy, Clock, Settings, Home, Users, HelpCircle } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import HowToPlayModal from "./Howtoplaymodal";

const NAV_ITEMS = [
  { href: "/dashboard", label: "My Corner", icon: Home },
  { href: "/lobby", label: "Roast Lobby", icon: Users },
  { href: "/leaderboard", label: "Burn Rankings", icon: Trophy },
  { href: "/history", label: "Roast History", icon: Clock },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function AppSidebar() {
  const { user } = useUser();
  const pathname = usePathname();
  const [showRules, setShowRules] = useState(false);

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-3 py-3">
          <span className="text-2xl">🔥</span>
          <div>
            <p className="text-sm font-black text-black dark:text-white">
              <span className="text-orange-500">ROAST</span>{" "}
              <span className="text-red-500">GAME</span>
            </p>
            <p className="text-[10px] text-gray-400">Bring the heat</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarMenu>
            {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
              <SidebarMenuItem key={href}>
                <SidebarMenuButton asChild isActive={pathname === href}>
                  <Link href={href} className="flex items-center gap-2">
                    <Icon size={16} />
                    <span>{label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Help</SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem>
              {/* Opens the rules modal in place — no navigation, so players
                  mid-lobby or mid-game never lose their spot. The full
                  /rules page still exists separately for sharing/bookmarking. */}
              <SidebarMenuButton onClick={() => setShowRules(true)}>
                <HelpCircle size={16} />
                <span>How to Play</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        {user && (
          <div className="px-3 py-2 border-t border-gray-200 dark:border-gray-800">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-orange-600 flex items-center justify-center text-sm">
                🔥
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-black dark:text-white truncate">
                  {user.fullName ?? user.username}
                </p>
                <p className="text-[10px] text-gray-400 truncate">
                  {user.primaryEmailAddress?.emailAddress}
                </p>
              </div>
            </div>
          </div>
        )}
      </SidebarFooter>

      <HowToPlayModal open={showRules} onClose={() => setShowRules(false)} />
    </Sidebar>
  );
}
