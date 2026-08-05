# pyrefly: ignore [missing-import]
import fitz  # PyMuPDF
# pyrefly: ignore [missing-import]
import pytesseract
from PIL import Image, ImageOps
import io
import logging
import os
import shutil

logger = logging.getLogger(__name__)


def _locate_tesseract() -> None:
    """Point pytesseract at a local Tesseract install.

    The Windows installer frequently does not add itself to PATH, so we check
    the standard install locations before giving up. An explicit
    TESSERACT_CMD environment variable always wins.
    """
    explicit = os.getenv("TESSERACT_CMD")
    if explicit and os.path.exists(explicit):
        pytesseract.pytesseract.tesseract_cmd = explicit
        return

    if shutil.which("tesseract"):
        return  # already on PATH

    candidates = [
        r"C:\Program Files\Tesseract-OCR\tesseract.exe",
        r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
        os.path.expanduser(r"~\AppData\Local\Programs\Tesseract-OCR\tesseract.exe"),
        "/usr/bin/tesseract",
        "/usr/local/bin/tesseract",
        "/opt/homebrew/bin/tesseract",
    ]
    for path in candidates:
        if os.path.exists(path):
            pytesseract.pytesseract.tesseract_cmd = path
            logger.info("Using Tesseract at %s", path)
            return


_locate_tesseract()

def extract_text_from_pdf(file_bytes: bytes) -> tuple[str, bool]:
    """
    Extracts text from a digital PDF using PyMuPDF.
    Returns a tuple of (extracted_text, is_scanned).
    """
    try:
        doc = fitz.open(stream=file_bytes, filetype="pdf")
        text = ""
        for page in doc:
            text += page.get_text()
        
        # If the extracted text is very short, it's likely a scanned PDF
        if len(text.strip()) < 50:
            return text, True
            
        return text, False
    except Exception as e:
        logger.error(f"PyMuPDF Extraction Error: {e}")
        return "", True

def _preprocess_for_ocr(image: "Image.Image") -> "Image.Image":
    """Clean an image up before OCR.

    Photographed and scanned medical documents are the hardest input this app
    takes, so three cheap fixes make a large accuracy difference:
      1. honour EXIF rotation (phone photos are often sideways)
      2. upscale small images (Tesseract needs roughly 300 DPI to read reliably)
      3. convert to greyscale and stretch contrast (handles poor lighting)
    """
    image = ImageOps.exif_transpose(image)
    image = image.convert("L")

    width, height = image.size
    longest = max(width, height)
    if longest < 1800:
        scale = 1800 / longest
        image = image.resize((int(width * scale), int(height * scale)), Image.LANCZOS)

    return ImageOps.autocontrast(image)


def extract_text_from_image(file_bytes: bytes) -> str:
    """
    Extracts text from an image using Tesseract OCR.
    """
    try:
        image = Image.open(io.BytesIO(file_bytes))
        prepared = _preprocess_for_ocr(image)

        text = pytesseract.image_to_string(prepared)

        # Layout mode 3 (the default) can under-read single-column documents
        # such as prescriptions. If we got very little back, retry assuming a
        # uniform block of text and keep whichever attempt read more.
        if len(text.strip()) < 120:
            alternative = pytesseract.image_to_string(prepared, config="--psm 6")
            if len(alternative.strip()) > len(text.strip()):
                text = alternative

        return text
    except pytesseract.TesseractNotFoundError:
        # Never fabricate medical content. Surface the misconfiguration instead so
        # the user sees a clear, actionable error rather than fake patient data.
        logger.error("Tesseract OCR is not installed or not on PATH.")
        raise RuntimeError(
            "Tesseract OCR is not installed or not on PATH, so scanned files cannot be read. "
            "Install it (Windows: https://github.com/UB-Mannheim/tesseract/wiki) or upload a text-based PDF."
        )
    except Exception as e:
        logger.error(f"OCR Extraction Error: {e}")
        return ""

def identify_document_type(text: str) -> str:
    """
    Identifies the document type based on simple heuristic keyword matching.
    """
    text_lower = text.lower()
    
    # Simple heuristics
    if any(kw in text_lower for kw in ["rx", "prescription", "take ", "mg ", "pharmacy"]):
        return "Prescription"
    elif any(kw in text_lower for kw in ["lab", "test results", "hemoglobin", "hba1c", "blood work", "range"]):
        return "Laboratory Report"
    elif any(kw in text_lower for kw in ["discharge", "summary", "admitted", "hospital course"]):
        return "Discharge Summary"
    elif any(kw in text_lower for kw in ["note", "clinic", "assessment", "plan"]):
        return "Doctor's Note"
    
    return "Unknown"

def process_document(filename: str, content_type: str, file_bytes: bytes) -> dict:
    """
    Main processing pipeline for a single document.
    """
    text = ""
    is_scanned = False
    file_ext = filename.split(".")[-1].lower() if "." in filename else ""
    
    file_type = "PDF" if "pdf" in content_type.lower() or file_ext == "pdf" else "IMAGE"
    
    if file_type == "PDF":
        text, is_scanned = extract_text_from_pdf(file_bytes)
        # Fallback to OCR if it's a scanned PDF
        if is_scanned:
            try:
                # Render each page at ~2x zoom (roughly 144 DPI) and OCR it.
                # Rendering above the default resolution materially improves
                # Tesseract accuracy on scanned documents.
                doc = fitz.open(stream=file_bytes, filetype="pdf")
                zoom = fitz.Matrix(2, 2)
                pages_to_read = min(len(doc), 10)  # guard against huge files
                ocr_chunks = []
                for page_number in range(pages_to_read):
                    page = doc.load_page(page_number)
                    pix = page.get_pixmap(matrix=zoom)
                    ocr_chunks.append(extract_text_from_image(pix.tobytes("png")))
                text = (text + "\n" + "\n".join(ocr_chunks)).strip()
            except RuntimeError:
                raise  # Tesseract missing — surface the real cause
            except Exception as e:
                logger.error(f"Failed to OCR scanned PDF: {e}")
    else:
        # It's an Image (PNG, JPG)
        is_scanned = True
        text = extract_text_from_image(file_bytes)
        
    doc_category = identify_document_type(text)
    
    return {
        "filename": filename,
        "file_type": "PDF" if file_type == "PDF" else file_ext.upper(),
        "is_scanned": is_scanned,
        "document_category": doc_category,
        "extracted_text": text
    }
