class DomainError(Exception):
    """Base exception for all domain/business errors."""
    pass

class NotFoundError(DomainError):
    """Raised when a requested resource/entity is not found."""
    def __init__(self, message: str = "Recurso no encontrado"):
        self.message = message
        super().__init__(self.message)

class BusinessRuleError(DomainError):
    """Raised when a business rule is violated."""
    def __init__(self, message: str = "Regla de negocio violada"):
        self.message = message
        super().__init__(self.message)
