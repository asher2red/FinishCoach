import { useI18n } from "../i18n/context";
import { Row, Button } from "../ui/design";
import { mainMenu, navigateToPage } from "./menu";

export function MenuNavigation({ activePage }: { activePage: string }) {
  const { t } = useI18n();
  return (
    <Row>
      {mainMenu.map((item) => (
        <Button
          key={item.href}
          variant="tile"
          icon={item.icon}
          title={t(item.labelKey)}
          selected={activePage === item.label}
          onPress={() => navigateToPage(item.label)}
        />
      ))}
    </Row>
  );
}
