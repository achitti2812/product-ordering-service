package com.example.orderservice.client;

import com.example.orderservice.model.ProductResponse;
import com.example.orderservice.model.StockRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;

import java.util.Optional;

@Component
public class ProductClient {

    private final RestClient restClient;

    public ProductClient(@Value("${product-service.base-url}") String productServiceBaseUrl) {
        this.restClient = RestClient.create(productServiceBaseUrl);
    }

    public Optional<ProductResponse> getProductById(Long productId) {
        try {
            ProductResponse product = restClient.get()
                    .uri("/products/{id}", productId)
                    .retrieve()
                    .body(ProductResponse.class);

            return Optional.ofNullable(product);
        } catch (HttpClientErrorException.NotFound exception) {
            return Optional.empty();
        }
    }

    public ProductResponse reduceStock(Long productId, int quantity) {
        return restClient.put()
                .uri("/products/{id}/stock", productId)
                .body(new StockRequest(quantity))
                .retrieve()
                .body(ProductResponse.class);
    }
}
