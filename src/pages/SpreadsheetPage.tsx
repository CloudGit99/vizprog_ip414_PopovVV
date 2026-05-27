import { useParams } from "react-router-dom";
import Spreadsheet from "../components/Spreadsheet/Spreadsheet";

/**
 * Страница конкретной таблицы.
 *
 * Берет id документа из URL и передает его в Spreadsheet для открытия.
 */
function SpreadsheetPage() {
  const { documentId } = useParams();

  return <Spreadsheet documentId={documentId} />;
}

export default SpreadsheetPage;
