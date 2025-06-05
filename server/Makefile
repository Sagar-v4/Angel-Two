gen:
	@echo "-> Generating gRPC code for Auth service..."
	@mkdir -p services/auth/gen/auth # Ensure the output directory exists
	@protoc \
		--proto_path=services/auth/protobuf \
		--go_out=services/auth/gen/auth \
		--go_opt=paths=source_relative \
  		--go-grpc_out=services/auth/gen/auth \
		--go-grpc_opt=paths=source_relative \
			auth.proto
	@echo "Auth gRPC code generation complete."