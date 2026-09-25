package com.example.productservice.service;

import com.example.productservice.model.Product;
import com.example.productservice.repository.ProductRepository;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Locale;
import java.util.Optional;

@Service
public class ProductService {

    private final ProductRepository productRepository;

    public ProductService(ProductRepository productRepository) {
        this.productRepository = productRepository;
    }

    @Transactional(readOnly = true)
    public List<Product> getAllProducts() {
        return productRepository.findAll(Sort.by(Sort.Direction.ASC, "id"));
    }

    @Transactional(readOnly = true)
    public List<Product> getProducts(String category, String search) {
        String categoryFilter = category == null ? "" : category.trim();
        String searchFilter = search == null ? "" : search.trim().toLowerCase(Locale.ROOT);

        if (categoryFilter.isEmpty() && searchFilter.isEmpty()) {
            return getAllProducts();
        }

        return getAllProducts().stream()
                .filter(product -> categoryFilter.isEmpty()
                        || product.getCategory().equalsIgnoreCase(categoryFilter))
                .filter(product -> searchFilter.isEmpty()
                        || product.getName().toLowerCase(Locale.ROOT).contains(searchFilter)
                        || product.getDescription().toLowerCase(Locale.ROOT).contains(searchFilter))
                .toList();
    }

    @Transactional(readOnly = true)
    public Optional<Product> getProductById(Long id) {
        return productRepository.findById(id);
    }

    @Transactional
    public Product reduceStock(Long id, int quantity) {
        if (quantity <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Quantity must be greater than 0");
        }

        int updatedRows = productRepository.reduceStockIfAvailable(id, quantity);

        if (updatedRows == 0) {
            if (!productRepository.existsById(id)) {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Product does not exist");
            }

            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Insufficient product stock");
        }

        return productRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Product does not exist"
                ));
    }
}
