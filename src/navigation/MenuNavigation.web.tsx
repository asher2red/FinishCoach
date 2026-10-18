import { Row, Button } from "../ui/design";
import { mainMenu, navigateToPage } from "./menu";

export function MenuNavigation({ activePage }: { activePage: string }) {
  return (
    <Row>
      {mainMenu.map((item) => (
        <Button
          key={item.href}
          variant="tile"
          icon={item.icon}
          title={item.label}
          selected={activePage === item.label}
          onPress={() => navigateToPage(item.label)}
        />
      ))}
    </Row>
  );
}
