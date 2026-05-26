import { useParams } from "react-router-dom";
import Spreadsheet from "../components/Spreadsheet/Spreadsheet";

function SpreadsheetPage() {
  const { documentId } = useParams();

  return <Spreadsheet documentId={documentId} />;
}

export default SpreadsheetPage;
