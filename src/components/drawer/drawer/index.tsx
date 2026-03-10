import BaseDrawer, { type DrawerProps } from "@mui/material/Drawer";
import type { PropsWithChildren } from "react";
import { grey } from "@mui/material/colors";
import { useColorModeContext } from "../../../contexts";

type Props = {} & DrawerProps;

export const Drawer = ({ children, ...props }: PropsWithChildren<Props>) => {
  const { mode } = useColorModeContext();

  return (
    <BaseDrawer
      {...props}
      sx={{
        "& .MuiDrawer-paper": {
          backgroundColor: mode === "light" ? grey[100] : "#000",
        },
        ...props.sx,
      }}
    >
      {children}
    </BaseDrawer>
  );
};
