# Chat(分析视频) 

## OpenAPI Specification

```yaml
openapi: 3.0.1
info:
  title: ''
  description: ''
  version: 1.0.0
paths:
  /v1/chat/completions:
    post:
      summary: 'Chat(分析视频) '
      deprecated: false
      description: |-
        所有对话模型，都可使用此接口， 修改 model 属性为模型名
        需要模型支持视频读取能力 
        暂时只有 Gemini 系列
      tags:
        - 聊天(Chat)
        - 模型接口/聊天接口（Chat）
      parameters:
        - name: Content-Type
          in: header
          description: ''
          required: true
          example: application/json
          schema:
            type: string
        - name: Accept
          in: header
          description: ''
          required: true
          example: application/json
          schema:
            type: string
        - name: Authorization
          in: header
          description: ''
          required: false
          example: Bearer {{YOUR_API_KEY}}
          schema:
            type: string
            default: Bearer {{YOUR_API_KEY}}
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                model:
                  type: string
                  description: >-
                    要使用的模型的 ID。有关哪些模型适用于聊天 API
                    的详细信息，请参阅[模型端点兼容性表。](https://platform.openai.com/docs/models/model-endpoint-compatibility)
                messages:
                  type: array
                  items:
                    type: object
                    properties:
                      role:
                        type: string
                      content:
                        type: string
                    x-apifox-orders:
                      - role
                      - content
                  description: >-
                    以[聊天格式](https://platform.openai.com/docs/guides/chat/introduction)生成聊天完成的消息。
                temperature:
                  type: integer
                  description: >-
                    使用什么采样温度，介于 0 和 2 之间。较高的值（如 0.8）将使输出更加随机，而较低的值（如
                    0.2）将使输出更加集中和确定。  我们通常建议改变这个或`top_p`但不是两者。
                top_p:
                  type: integer
                  description: >-
                    一种替代温度采样的方法，称为核采样，其中模型考虑具有 top_p 概率质量的标记的结果。所以 0.1 意味着只考虑构成前
                    10% 概率质量的标记。  我们通常建议改变这个或`temperature`但不是两者。
                'n':
                  type: integer
                  description: 为每个输入消息生成多少个聊天完成选项。
                stream:
                  type: boolean
                  description: >-
                    如果设置，将发送部分消息增量，就像在 ChatGPT
                    中一样。当令牌可用时，令牌将作为纯数据[服务器发送事件](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events#Event_stream_format)`data:
                    [DONE]`发送，流由消息终止。[有关示例代码](https://github.com/openai/openai-cookbook/blob/main/examples/How_to_stream_completions.ipynb)，请参阅
                    OpenAI Cookbook 。
                stop:
                  type: string
                  description: API 将停止生成更多令牌的最多 4 个序列。
                max_tokens:
                  type: integer
                  description: 聊天完成时生成的最大令牌数。  输入标记和生成标记的总长度受模型上下文长度的限制。
                presence_penalty:
                  type: number
                  description: >-
                    -2.0 和 2.0 之间的数字。正值会根据到目前为止是否出现在文本中来惩罚新标记，从而增加模型谈论新主题的可能性。 
                    [查看有关频率和存在惩罚的更多信息。](https://platform.openai.com/docs/api-reference/parameter-details)
                frequency_penalty:
                  type: number
                  description: >-
                    -2.0 和 2.0 之间的数字。正值会根据新标记在文本中的现有频率对其进行惩罚，从而降低模型逐字重复同一行的可能性。 
                    [查看有关频率和存在惩罚的更多信息。](https://platform.openai.com/docs/api-reference/parameter-details)
                logit_bias:
                  type: 'null'
                  description: >-
                    修改指定标记出现在完成中的可能性。  接受一个 json 对象，该对象将标记（由标记器中的标记 ID 指定）映射到从
                    -100 到 100 的关联偏差值。从数学上讲，偏差会在采样之前添加到模型生成的 logits
                    中。确切的效果因模型而异，但 -1 和 1 之间的值应该会减少或增加选择的可能性；像 -100 或 100
                    这样的值应该导致相关令牌的禁止或独占选择。
                user:
                  type: string
                  description: >-
                    代表您的最终用户的唯一标识符，可以帮助 OpenAI
                    监控和检测滥用行为。[了解更多](https://platform.openai.com/docs/guides/safety-best-practices/end-user-ids)。
              required:
                - model
                - messages
              x-apifox-orders:
                - model
                - messages
                - temperature
                - top_p
                - 'n'
                - stream
                - stop
                - max_tokens
                - presence_penalty
                - frequency_penalty
                - logit_bias
                - user
            example:
              model: gemini-2.5-pro-preview-05-06
              stream: true
              messages:
                - role: user
                  content:
                    - type: text
                      text: 这个视频讲了什么？
                    - type: image_url
                      image_url:
                        url: >-
                          https://cdn.klingai.com/bs2/upload-kling-api/9940478466/image2video/ChDGZWhmQd8AAAAAAWo7kg-0_raw_video_2.mp4
              max_tokens: 4000
      responses:
        '200':
          description: ''
          content:
            application/json:
              schema:
                type: object
                properties:
                  id:
                    type: string
                  object:
                    type: string
                  created:
                    type: integer
                  choices:
                    type: array
                    items:
                      type: object
                      properties:
                        index:
                          type: integer
                        message:
                          type: object
                          properties:
                            role:
                              type: string
                            content:
                              type: string
                          required:
                            - role
                            - content
                          x-apifox-orders:
                            - role
                            - content
                        finish_reason:
                          type: string
                      x-apifox-orders:
                        - index
                        - message
                        - finish_reason
                  usage:
                    type: object
                    properties:
                      prompt_tokens:
                        type: integer
                      completion_tokens:
                        type: integer
                      total_tokens:
                        type: integer
                    required:
                      - prompt_tokens
                      - completion_tokens
                      - total_tokens
                    x-apifox-orders:
                      - prompt_tokens
                      - completion_tokens
                      - total_tokens
                required:
                  - id
                  - object
                  - created
                  - choices
                  - usage
                x-apifox-orders:
                  - id
                  - object
                  - created
                  - choices
                  - usage
          headers: {}
          x-apifox-name: OK
      security: []
      x-apifox-folder: 聊天(Chat)
      x-apifox-status: released
      x-run-in-apifox: https://app.apifox.com/web/project/3868318/apis/api-321040299-run
components:
  schemas: {}
  securitySchemes: {}
servers: []
security: []

```


# Chat(结构化输出) 

## OpenAPI Specification

```yaml
openapi: 3.0.1
info:
  title: ''
  description: ''
  version: 1.0.0
paths:
  /v1/chat/completions:
    post:
      summary: 'Chat(结构化输出) '
      deprecated: false
      description: >+
        [官方指南](https://platform.openai.com/docs/guides/text-generation/chat-completions-api)

        [官方API文档](https://platform.openai.com/docs/api-reference/chat)

        所有对话模型，都可使用此接口， 修改 model 属性为模型名

        给定一个提示，该模型将返回一个或多个预测的完成，并且还可以返回每个位置的替代标记的概率。

        为提供的提示和参数创建完成


      tags:
        - 聊天(Chat)
      parameters:
        - name: Content-Type
          in: header
          description: ''
          required: true
          example: application/json
          schema:
            type: string
        - name: Accept
          in: header
          description: ''
          required: true
          example: application/json
          schema:
            type: string
        - name: Authorization
          in: header
          description: ''
          required: false
          example: Bearer {{YOUR_API_KEY}}
          schema:
            type: string
            default: Bearer {{YOUR_API_KEY}}
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                model:
                  type: string
                  description: |+
                    要使用的模型的 ID。有关哪些模型可与聊天 API 一起使用的详细信息,请参阅模型端点兼容性表。

                messages:
                  type: array
                  items:
                    type: object
                    properties:
                      role:
                        type: string
                      content:
                        type: string
                    x-apifox-orders:
                      - role
                      - content
                  description: 至今为止对话所包含的消息列表。Python 代码示例。
                temperature:
                  type: integer
                  description: >-
                    使用什么采样温度，介于 0 和 2 之间。较高的值（如 0.8）将使输出更加随机，而较低的值（如
                    0.2）将使输出更加集中和确定。  我们通常建议改变这个或`top_p`但不是两者。
                top_p:
                  type: integer
                  description: >-
                    一种替代温度采样的方法，称为核采样，其中模型考虑具有 top_p 概率质量的标记的结果。所以 0.1 意味着只考虑构成前
                    10% 概率质量的标记。  我们通常建议改变这个或`temperature`但不是两者。
                'n':
                  type: integer
                  description: |-
                    默认为 1
                    为每个输入消息生成多少个聊天补全选择。
                stream:
                  type: boolean
                  description: >-
                    默认为 false 如果设置,则像在 ChatGPT
                    中一样会发送部分消息增量。标记将以仅数据的服务器发送事件的形式发送,这些事件在可用时,并在 data: [DONE]
                    消息终止流。Python 代码示例。
                stop:
                  type: string
                  description: 默认为 null 最多 4 个序列,API 将停止进一步生成标记。
                max_tokens:
                  type: integer
                  description: |-
                    默认为 inf
                    在聊天补全中生成的最大标记数。

                    输入标记和生成标记的总长度受模型的上下文长度限制。计算标记的 Python 代码示例。
                presence_penalty:
                  type: number
                  description: >-
                    -2.0 和 2.0 之间的数字。正值会根据到目前为止是否出现在文本中来惩罚新标记，从而增加模型谈论新主题的可能性。 
                    [查看有关频率和存在惩罚的更多信息。](https://platform.openai.com/docs/api-reference/parameter-details)
                frequency_penalty:
                  type: number
                  description: >-
                    默认为 0 -2.0 到 2.0 之间的数字。正值根据文本目前的存在频率惩罚新标记,降低模型重复相同行的可能性。 
                    有关频率和存在惩罚的更多信息。
                logit_bias:
                  type: 'null'
                  description: >-
                    修改指定标记出现在补全中的可能性。


                    接受一个 JSON 对象,该对象将标记(由标记器指定的标记 ID)映射到相关的偏差值(-100 到
                    100)。从数学上讲,偏差在对模型进行采样之前添加到模型生成的 logit 中。确切效果因模型而异,但-1 和 1
                    之间的值应减少或增加相关标记的选择可能性;如-100 或 100 这样的值应导致相关标记的禁用或独占选择。
                user:
                  type: string
                  description: >-
                    代表您的最终用户的唯一标识符，可以帮助 OpenAI
                    监控和检测滥用行为。[了解更多](https://platform.openai.com/docs/guides/safety-best-practices/end-user-ids)。
                response_format:
                  type: object
                  properties: {}
                  x-apifox-orders: []
                  description: >-
                    指定模型必须输出的格式的对象。  将 { "type": "json_object" } 启用 JSON
                    模式,这可以确保模型生成的消息是有效的 JSON。  重要提示:使用 JSON
                    模式时,还必须通过系统或用户消息指示模型生成
                    JSON。如果不这样做,模型可能会生成无休止的空白流,直到生成达到令牌限制,从而导致延迟增加和请求“卡住”的外观。另请注意,如果
                    finish_reason="length",则消息内容可能会被部分切断,这表示生成超过了 max_tokens
                    或对话超过了最大上下文长度。  显示属性
                seen:
                  type: integer
                  description: >-
                    此功能处于测试阶段。如果指定,我们的系统将尽最大努力确定性地进行采样,以便使用相同的种子和参数进行重复请求应返回相同的结果。不能保证确定性,您应该参考
                    system_fingerprint 响应参数来监控后端的更改。
                tools:
                  type: array
                  items:
                    type: string
                  description: 模型可以调用的一组工具列表。目前,只支持作为工具的函数。使用此功能来提供模型可以为之生成 JSON 输入的函数列表。
                tool_choice:
                  type: object
                  properties: {}
                  description: >-
                    控制模型调用哪个函数(如果有的话)。none 表示模型不会调用函数,而是生成消息。auto
                    表示模型可以在生成消息和调用函数之间进行选择。通过 {"type": "function", "function":
                    {"name": "my_function"}} 强制模型调用该函数。  如果没有函数存在,默认为
                    none。如果有函数存在,默认为 auto。  显示可能的类型
                  x-apifox-orders: []
              required:
                - model
                - messages
                - tools
                - tool_choice
              x-apifox-orders:
                - model
                - messages
                - temperature
                - top_p
                - 'n'
                - stream
                - stop
                - max_tokens
                - presence_penalty
                - frequency_penalty
                - logit_bias
                - user
                - response_format
                - seen
                - tools
                - tool_choice
            example:
              model: gpt-4o-2024-08-06
              messages:
                - role: system
                  content: >-
                    You are a helpful math tutor. Guide the user through the
                    solution step by step.
                - role: user
                  content: 9.11和9.8谁大
              response_format:
                type: json_schema
                json_schema:
                  name: math_reasoning
                  schema:
                    type: object
                    properties:
                      steps:
                        type: array
                        items:
                          type: object
                          properties:
                            explanation:
                              type: string
                            output:
                              type: string
                          required:
                            - explanation
                            - output
                          additionalProperties: false
                      final_answer:
                        type: string
                    required:
                      - steps
                      - final_answer
                    additionalProperties: false
                  strict: true
      responses:
        '200':
          description: ''
          content:
            application/json:
              schema:
                type: object
                properties:
                  id:
                    type: string
                  object:
                    type: string
                  created:
                    type: integer
                  choices:
                    type: array
                    items:
                      type: object
                      properties:
                        index:
                          type: integer
                        message:
                          type: object
                          properties:
                            role:
                              type: string
                            content:
                              type: string
                          required:
                            - role
                            - content
                          x-apifox-orders:
                            - role
                            - content
                        finish_reason:
                          type: string
                      x-apifox-orders:
                        - index
                        - message
                        - finish_reason
                  usage:
                    type: object
                    properties:
                      prompt_tokens:
                        type: integer
                      completion_tokens:
                        type: integer
                      total_tokens:
                        type: integer
                    required:
                      - prompt_tokens
                      - completion_tokens
                      - total_tokens
                    x-apifox-orders:
                      - prompt_tokens
                      - completion_tokens
                      - total_tokens
                required:
                  - id
                  - object
                  - created
                  - choices
                  - usage
                x-apifox-orders:
                  - id
                  - object
                  - created
                  - choices
                  - usage
          headers: {}
          x-apifox-name: OK
      security: []
      x-apifox-folder: 聊天(Chat)
      x-apifox-status: released
      x-run-in-apifox: https://app.apifox.com/web/project/3868318/apis/api-287782788-run
components:
  schemas: {}
  securitySchemes: {}
servers: []
security: []

```

# Chat(指定GPTs)

## OpenAPI Specification

```yaml
openapi: 3.0.1
info:
  title: ''
  description: ''
  version: 1.0.0
paths:
  /v1/chat/completions:
    post:
      summary: Chat(指定GPTs)
      deprecated: false
      description: |+
        模型名称格式为：gpt-4-gizmo-*，系统会自动进行识别
        比如这个gpts：https://chat.openai.com/g/g-bo0FiWLY7-researchgpt
        模型名称就填写：gpt-4-gizmo-g-bo0FiWLY7

      tags:
        - 聊天(Chat)
      parameters:
        - name: Content-Type
          in: header
          description: ''
          required: true
          example: application/json
          schema:
            type: string
        - name: Accept
          in: header
          description: ''
          required: true
          example: application/json
          schema:
            type: string
        - name: Authorization
          in: header
          description: ''
          required: false
          example: Bearer {{YOUR_API_KEY}}
          schema:
            type: string
            default: Bearer {{YOUR_API_KEY}}
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                model:
                  type: string
                  description: >-
                    要使用的模型的 ID。有关哪些模型适用于聊天 API
                    的详细信息，请参阅[模型端点兼容性表。](https://platform.openai.com/docs/models/model-endpoint-compatibility)
                messages:
                  type: array
                  items:
                    type: object
                    properties:
                      role:
                        type: string
                      content:
                        type: string
                    x-apifox-orders:
                      - role
                      - content
                  description: >-
                    以[聊天格式](https://platform.openai.com/docs/guides/chat/introduction)生成聊天完成的消息。
                temperature:
                  type: integer
                  description: >-
                    使用什么采样温度，介于 0 和 2 之间。较高的值（如 0.8）将使输出更加随机，而较低的值（如
                    0.2）将使输出更加集中和确定。  我们通常建议改变这个或`top_p`但不是两者。
                top_p:
                  type: integer
                  description: >-
                    一种替代温度采样的方法，称为核采样，其中模型考虑具有 top_p 概率质量的标记的结果。所以 0.1 意味着只考虑构成前
                    10% 概率质量的标记。  我们通常建议改变这个或`temperature`但不是两者。
                'n':
                  type: integer
                  description: 为每个输入消息生成多少个聊天完成选项。
                stream:
                  type: boolean
                  description: >-
                    如果设置，将发送部分消息增量，就像在 ChatGPT
                    中一样。当令牌可用时，令牌将作为纯数据[服务器发送事件](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events#Event_stream_format)`data:
                    [DONE]`发送，流由消息终止。[有关示例代码](https://github.com/openai/openai-cookbook/blob/main/examples/How_to_stream_completions.ipynb)，请参阅
                    OpenAI Cookbook 。
                stop:
                  type: string
                  description: API 将停止生成更多令牌的最多 4 个序列。
                max_tokens:
                  type: integer
                  description: 聊天完成时生成的最大令牌数。  输入标记和生成标记的总长度受模型上下文长度的限制。
                presence_penalty:
                  type: number
                  description: >-
                    -2.0 和 2.0 之间的数字。正值会根据到目前为止是否出现在文本中来惩罚新标记，从而增加模型谈论新主题的可能性。 
                    [查看有关频率和存在惩罚的更多信息。](https://platform.openai.com/docs/api-reference/parameter-details)
                frequency_penalty:
                  type: number
                  description: >-
                    -2.0 和 2.0 之间的数字。正值会根据新标记在文本中的现有频率对其进行惩罚，从而降低模型逐字重复同一行的可能性。 
                    [查看有关频率和存在惩罚的更多信息。](https://platform.openai.com/docs/api-reference/parameter-details)
                logit_bias:
                  type: 'null'
                  description: >-
                    修改指定标记出现在完成中的可能性。  接受一个 json 对象，该对象将标记（由标记器中的标记 ID 指定）映射到从
                    -100 到 100 的关联偏差值。从数学上讲，偏差会在采样之前添加到模型生成的 logits
                    中。确切的效果因模型而异，但 -1 和 1 之间的值应该会减少或增加选择的可能性；像 -100 或 100
                    这样的值应该导致相关令牌的禁止或独占选择。
                user:
                  type: string
                  description: >-
                    代表您的最终用户的唯一标识符，可以帮助 OpenAI
                    监控和检测滥用行为。[了解更多](https://platform.openai.com/docs/guides/safety-best-practices/end-user-ids)。
              required:
                - model
                - messages
              x-apifox-orders:
                - model
                - messages
                - temperature
                - top_p
                - 'n'
                - stream
                - stop
                - max_tokens
                - presence_penalty
                - frequency_penalty
                - logit_bias
                - user
            example:
              model: gpt-4-gizmo-g-IcWrQy2I9
              messages:
                - role: user
                  content: 你是谁
      responses:
        '200':
          description: ''
          content:
            application/json:
              schema:
                type: object
                properties:
                  id:
                    type: string
                  object:
                    type: string
                  created:
                    type: integer
                  choices:
                    type: array
                    items:
                      type: object
                      properties:
                        index:
                          type: integer
                        message:
                          type: object
                          properties:
                            role:
                              type: string
                            content:
                              type: string
                          required:
                            - role
                            - content
                          x-apifox-orders:
                            - role
                            - content
                        finish_reason:
                          type: string
                      x-apifox-orders:
                        - index
                        - message
                        - finish_reason
                  usage:
                    type: object
                    properties:
                      prompt_tokens:
                        type: integer
                      completion_tokens:
                        type: integer
                      total_tokens:
                        type: integer
                    required:
                      - prompt_tokens
                      - completion_tokens
                      - total_tokens
                    x-apifox-orders:
                      - prompt_tokens
                      - completion_tokens
                      - total_tokens
                required:
                  - id
                  - object
                  - created
                  - choices
                  - usage
                x-apifox-orders:
                  - id
                  - object
                  - created
                  - choices
                  - usage
          headers: {}
          x-apifox-name: OK
      security: []
      x-apifox-folder: 聊天(Chat)
      x-apifox-status: released
      x-run-in-apifox: https://app.apifox.com/web/project/3868318/apis/api-153827428-run
components:
  schemas: {}
  securitySchemes: {}
servers: []
security: []

```


# Chat(工具tools调用)

## OpenAPI Specification

```yaml
openapi: 3.0.1
info:
  title: ''
  description: ''
  version: 1.0.0
paths:
  /v1/chat/completions:
    post:
      summary: Chat(工具tools调用)
      deprecated: false
      description: >+
        [官方指南](https://platform.openai.com/docs/guides/text-generation/chat-completions-api)

        [官方API文档](https://platform.openai.com/docs/api-reference/chat)

        所有对话模型，都可使用此接口， 修改 model 属性为模型名

        给定一个提示，该模型将返回一个或多个预测的完成，并且还可以返回每个位置的替代标记的概率。

        为提供的提示和参数创建完成 

        测试页面： https://cooksleep.github.io/newapi-special-test/

      tags:
        - 聊天(Chat)
      parameters:
        - name: Content-Type
          in: header
          description: ''
          required: true
          example: application/json
          schema:
            type: string
        - name: Accept
          in: header
          description: ''
          required: true
          example: application/json
          schema:
            type: string
        - name: Authorization
          in: header
          description: ''
          required: false
          example: Bearer {{YOUR_API_KEY}}
          schema:
            type: string
            default: Bearer {{YOUR_API_KEY}}
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                model:
                  type: string
                  description: |+
                    要使用的模型的 ID。有关哪些模型可与聊天 API 一起使用的详细信息,请参阅模型端点兼容性表。

                messages:
                  type: array
                  items:
                    type: object
                    properties:
                      role:
                        type: string
                      content:
                        type: string
                    x-apifox-orders:
                      - role
                      - content
                  description: 至今为止对话所包含的消息列表。Python 代码示例。
                temperature:
                  type: integer
                  description: >-
                    使用什么采样温度，介于 0 和 2 之间。较高的值（如 0.8）将使输出更加随机，而较低的值（如
                    0.2）将使输出更加集中和确定。  我们通常建议改变这个或`top_p`但不是两者。
                top_p:
                  type: integer
                  description: >-
                    一种替代温度采样的方法，称为核采样，其中模型考虑具有 top_p 概率质量的标记的结果。所以 0.1 意味着只考虑构成前
                    10% 概率质量的标记。  我们通常建议改变这个或`temperature`但不是两者。
                'n':
                  type: integer
                  description: |-
                    默认为 1
                    为每个输入消息生成多少个聊天补全选择。
                stream:
                  type: boolean
                  description: >-
                    默认为 false 如果设置,则像在 ChatGPT
                    中一样会发送部分消息增量。标记将以仅数据的服务器发送事件的形式发送,这些事件在可用时,并在 data: [DONE]
                    消息终止流。Python 代码示例。
                stop:
                  type: string
                  description: 默认为 null 最多 4 个序列,API 将停止进一步生成标记。
                max_tokens:
                  type: integer
                  description: |-
                    默认为 inf
                    在聊天补全中生成的最大标记数。

                    输入标记和生成标记的总长度受模型的上下文长度限制。计算标记的 Python 代码示例。
                presence_penalty:
                  type: number
                  description: >-
                    -2.0 和 2.0 之间的数字。正值会根据到目前为止是否出现在文本中来惩罚新标记，从而增加模型谈论新主题的可能性。 
                    [查看有关频率和存在惩罚的更多信息。](https://platform.openai.com/docs/api-reference/parameter-details)
                frequency_penalty:
                  type: number
                  description: >-
                    默认为 0 -2.0 到 2.0 之间的数字。正值根据文本目前的存在频率惩罚新标记,降低模型重复相同行的可能性。 
                    有关频率和存在惩罚的更多信息。
                logit_bias:
                  type: 'null'
                  description: >-
                    修改指定标记出现在补全中的可能性。


                    接受一个 JSON 对象,该对象将标记(由标记器指定的标记 ID)映射到相关的偏差值(-100 到
                    100)。从数学上讲,偏差在对模型进行采样之前添加到模型生成的 logit 中。确切效果因模型而异,但-1 和 1
                    之间的值应减少或增加相关标记的选择可能性;如-100 或 100 这样的值应导致相关标记的禁用或独占选择。
                user:
                  type: string
                  description: >-
                    代表您的最终用户的唯一标识符，可以帮助 OpenAI
                    监控和检测滥用行为。[了解更多](https://platform.openai.com/docs/guides/safety-best-practices/end-user-ids)。
                response_format:
                  type: object
                  properties: {}
                  x-apifox-orders: []
                  description: >-
                    指定模型必须输出的格式的对象。  将 { "type": "json_object" } 启用 JSON
                    模式,这可以确保模型生成的消息是有效的 JSON。  重要提示:使用 JSON
                    模式时,还必须通过系统或用户消息指示模型生成
                    JSON。如果不这样做,模型可能会生成无休止的空白流,直到生成达到令牌限制,从而导致延迟增加和请求“卡住”的外观。另请注意,如果
                    finish_reason="length",则消息内容可能会被部分切断,这表示生成超过了 max_tokens
                    或对话超过了最大上下文长度。  显示属性
                seen:
                  type: integer
                  description: >-
                    此功能处于测试阶段。如果指定,我们的系统将尽最大努力确定性地进行采样,以便使用相同的种子和参数进行重复请求应返回相同的结果。不能保证确定性,您应该参考
                    system_fingerprint 响应参数来监控后端的更改。
                tools:
                  type: array
                  items:
                    type: string
                  description: 模型可以调用的一组工具列表。目前,只支持作为工具的函数。使用此功能来提供模型可以为之生成 JSON 输入的函数列表。
                tool_choice:
                  type: object
                  properties: {}
                  description: >-
                    控制模型调用哪个函数(如果有的话)。none 表示模型不会调用函数,而是生成消息。auto
                    表示模型可以在生成消息和调用函数之间进行选择。通过 {"type": "function", "function":
                    {"name": "my_function"}} 强制模型调用该函数。  如果没有函数存在,默认为
                    none。如果有函数存在,默认为 auto。  显示可能的类型
                  x-apifox-orders: []
              required:
                - model
                - messages
                - tools
                - tool_choice
              x-apifox-orders:
                - model
                - messages
                - temperature
                - top_p
                - 'n'
                - stream
                - stop
                - max_tokens
                - presence_penalty
                - frequency_penalty
                - logit_bias
                - user
                - response_format
                - seen
                - tools
                - tool_choice
            examples: {}
      responses:
        '200':
          description: ''
          content:
            application/json:
              schema:
                type: object
                properties:
                  id:
                    type: string
                  object:
                    type: string
                  created:
                    type: integer
                  choices:
                    type: array
                    items:
                      type: object
                      properties:
                        index:
                          type: integer
                        message:
                          type: object
                          properties:
                            role:
                              type: string
                            content:
                              type: string
                          required:
                            - role
                            - content
                          x-apifox-orders:
                            - role
                            - content
                        finish_reason:
                          type: string
                      x-apifox-orders:
                        - index
                        - message
                        - finish_reason
                  usage:
                    type: object
                    properties:
                      prompt_tokens:
                        type: integer
                      completion_tokens:
                        type: integer
                      total_tokens:
                        type: integer
                    required:
                      - prompt_tokens
                      - completion_tokens
                      - total_tokens
                    x-apifox-orders:
                      - prompt_tokens
                      - completion_tokens
                      - total_tokens
                required:
                  - id
                  - object
                  - created
                  - choices
                  - usage
                x-apifox-orders:
                  - id
                  - object
                  - created
                  - choices
                  - usage
          headers: {}
          x-apifox-name: OK
      security: []
      x-apifox-folder: 聊天(Chat)
      x-apifox-status: released
      x-run-in-apifox: https://app.apifox.com/web/project/3868318/apis/api-223322111-run
components:
  schemas: {}
  securitySchemes: {}
servers: []
security: []

```

# Chat(Claude Thinking)

## OpenAPI Specification

```yaml
openapi: 3.0.1
info:
  title: ''
  description: ''
  version: 1.0.0
paths:
  /v1/chat/completions:
    post:
      summary: Chat(Claude Thinking)
      deprecated: false
      description: |+
        给定一个提示，该模型将返回一个或多个预测的完成，并且还可以返回每个位置的替代标记的概率。

        为提供的提示和参数创建完成

      tags:
        - 聊天(Chat)
      parameters:
        - name: Content-Type
          in: header
          description: ''
          required: true
          example: application/json
          schema:
            type: string
        - name: Accept
          in: header
          description: ''
          required: true
          example: application/json
          schema:
            type: string
        - name: Authorization
          in: header
          description: ''
          required: false
          example: Bearer {{YOUR_API_KEY}}
          schema:
            type: string
            default: Bearer {{YOUR_API_KEY}}
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                model:
                  type: string
                  description: |+
                    要使用的模型的 ID。有关哪些模型可与聊天 API 一起使用的详细信息,请参阅模型端点兼容性表。

                messages:
                  type: array
                  items:
                    type: object
                    properties:
                      role:
                        type: string
                      content:
                        type: string
                    x-apifox-orders:
                      - role
                      - content
                  description: 至今为止对话所包含的消息列表。Python 代码示例。
                temperature:
                  type: integer
                  description: >-
                    使用什么采样温度，介于 0 和 2 之间。较高的值（如 0.8）将使输出更加随机，而较低的值（如
                    0.2）将使输出更加集中和确定。  我们通常建议改变这个或`top_p`但不是两者。
                top_p:
                  type: integer
                  description: >-
                    一种替代温度采样的方法，称为核采样，其中模型考虑具有 top_p 概率质量的标记的结果。所以 0.1 意味着只考虑构成前
                    10% 概率质量的标记。  我们通常建议改变这个或`temperature`但不是两者。
                'n':
                  type: integer
                  description: |-
                    默认为 1
                    为每个输入消息生成多少个聊天补全选择。
                stream:
                  type: boolean
                  description: >-
                    默认为 false 如果设置,则像在 ChatGPT
                    中一样会发送部分消息增量。标记将以仅数据的服务器发送事件的形式发送,这些事件在可用时,并在 data: [DONE]
                    消息终止流。Python 代码示例。
                stop:
                  type: string
                  description: 默认为 null 最多 4 个序列,API 将停止进一步生成标记。
                max_tokens:
                  type: integer
                  description: |-
                    默认为 inf
                    在聊天补全中生成的最大标记数。

                    输入标记和生成标记的总长度受模型的上下文长度限制。计算标记的 Python 代码示例。
                presence_penalty:
                  type: number
                  description: >-
                    -2.0 和 2.0 之间的数字。正值会根据到目前为止是否出现在文本中来惩罚新标记，从而增加模型谈论新主题的可能性。 
                    [查看有关频率和存在惩罚的更多信息。](https://platform.openai.com/docs/api-reference/parameter-details)
                frequency_penalty:
                  type: number
                  description: >-
                    默认为 0 -2.0 到 2.0 之间的数字。正值根据文本目前的存在频率惩罚新标记,降低模型重复相同行的可能性。 
                    有关频率和存在惩罚的更多信息。
                logit_bias:
                  type: 'null'
                  description: >-
                    修改指定标记出现在补全中的可能性。


                    接受一个 JSON 对象,该对象将标记(由标记器指定的标记 ID)映射到相关的偏差值(-100 到
                    100)。从数学上讲,偏差在对模型进行采样之前添加到模型生成的 logit 中。确切效果因模型而异,但-1 和 1
                    之间的值应减少或增加相关标记的选择可能性;如-100 或 100 这样的值应导致相关标记的禁用或独占选择。
                user:
                  type: string
                  description: >-
                    代表您的最终用户的唯一标识符，可以帮助 OpenAI
                    监控和检测滥用行为。[了解更多](https://platform.openai.com/docs/guides/safety-best-practices/end-user-ids)。
                response_format:
                  type: object
                  properties: {}
                  x-apifox-orders: []
                  description: >-
                    指定模型必须输出的格式的对象。  将 { "type": "json_object" } 启用 JSON
                    模式,这可以确保模型生成的消息是有效的 JSON。  重要提示:使用 JSON
                    模式时,还必须通过系统或用户消息指示模型生成
                    JSON。如果不这样做,模型可能会生成无休止的空白流,直到生成达到令牌限制,从而导致延迟增加和请求“卡住”的外观。另请注意,如果
                    finish_reason="length",则消息内容可能会被部分切断,这表示生成超过了 max_tokens
                    或对话超过了最大上下文长度。  显示属性
                seen:
                  type: integer
                  description: >-
                    此功能处于测试阶段。如果指定,我们的系统将尽最大努力确定性地进行采样,以便使用相同的种子和参数进行重复请求应返回相同的结果。不能保证确定性,您应该参考
                    system_fingerprint 响应参数来监控后端的更改。
                tools:
                  type: array
                  items:
                    type: string
                  description: 模型可以调用的一组工具列表。目前,只支持作为工具的函数。使用此功能来提供模型可以为之生成 JSON 输入的函数列表。
                tool_choice:
                  type: object
                  properties: {}
                  description: >-
                    控制模型调用哪个函数(如果有的话)。none 表示模型不会调用函数,而是生成消息。auto
                    表示模型可以在生成消息和调用函数之间进行选择。通过 {"type": "function", "function":
                    {"name": "my_function"}} 强制模型调用该函数。  如果没有函数存在,默认为
                    none。如果有函数存在,默认为 auto。  显示可能的类型
                  x-apifox-orders: []
              required:
                - model
                - messages
                - tools
                - tool_choice
              x-apifox-orders:
                - model
                - messages
                - temperature
                - top_p
                - 'n'
                - stream
                - stop
                - max_tokens
                - presence_penalty
                - frequency_penalty
                - logit_bias
                - user
                - response_format
                - seen
                - tools
                - tool_choice
            example:
              model: claude-3-7-sonnet-20250219-thinking
              messages:
                - role: user
                  content: Hello!
      responses:
        '200':
          description: ''
          content:
            application/json:
              schema:
                type: object
                properties:
                  id:
                    type: string
                  object:
                    type: string
                  created:
                    type: integer
                  choices:
                    type: array
                    items:
                      type: object
                      properties:
                        index:
                          type: integer
                        message:
                          type: object
                          properties:
                            role:
                              type: string
                            content:
                              type: string
                          required:
                            - role
                            - content
                          x-apifox-orders:
                            - role
                            - content
                        finish_reason:
                          type: string
                      x-apifox-orders:
                        - index
                        - message
                        - finish_reason
                  usage:
                    type: object
                    properties:
                      prompt_tokens:
                        type: integer
                      completion_tokens:
                        type: integer
                      total_tokens:
                        type: integer
                    required:
                      - prompt_tokens
                      - completion_tokens
                      - total_tokens
                    x-apifox-orders:
                      - prompt_tokens
                      - completion_tokens
                      - total_tokens
                required:
                  - id
                  - object
                  - created
                  - choices
                  - usage
                x-apifox-orders:
                  - id
                  - object
                  - created
                  - choices
                  - usage
          headers: {}
          x-apifox-name: OK
      security: []
      x-apifox-folder: 聊天(Chat)
      x-apifox-status: released
      x-run-in-apifox: https://app.apifox.com/web/project/3868318/apis/api-266125510-run
components:
  schemas: {}
  securitySchemes: {}
servers: []
security: []

```

# Responses API与Chat API对比


https://platform.openai.com/docs/guides/responses-vs-chat-completions

## 1.简介
在OpenAIQ的生态系统中，开发者可以通过两种主要API与模型进行交互：Responses API和Chat Completions API。.本教程将深入探讨
这两者之间的区别、适用场景以及如何选择最适合您项目需求的API。
## 2.概述比较
Responses APl
·定位：最新的核心API,是一个代理型API原语
·特点：结合了Chat Completionsi的简洁性与更多代理任务的能力
·推荐对象：新用户
·内置工具：网络搜索、文件搜索、计算机使用
Chat Completions API
·定位：构建A应用的行业标准
·特点：稳定、广泛使用
·未来规划：OpenAi计划无限期支持

## 什么场景需要使用 Response API
Responses API 是我们最新的核心 API，也是一个代理 API 原语，它结合了聊天完成的简便性以及执行更多代理任务的能力。随着模型功能的不断发展，Responses API 将成为构建面向操作的应用程序的灵活基础，并内置以下工具：


![image.png](https://api.apifox.com/api/v1/projects/3868318/resources/545286/image-preview)


# 创建模型响应

## OpenAPI Specification

```yaml
openapi: 3.0.1
info:
  title: ''
  description: ''
  version: 1.0.0
paths:
  /v1/responses:
    post:
      summary: 创建模型响应
      deprecated: false
      description: |
        https://platform.openai.com/docs/api-reference/responses/create

        部分OpenAI模型仅支持Response格式，例如o3-pro，codex-mini-latest
      tags:
        - 聊天(Responses)
      parameters:
        - name: Authorization
          in: header
          description: ''
          required: false
          example: Bearer {{YOUR_API_KEY}}
          schema:
            type: string
            default: Bearer {{YOUR_API_KEY}}
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                model:
                  type: string
                input:
                  type: array
                  items:
                    type: object
                    properties:
                      role:
                        type: string
                      content:
                        type: string
                    x-apifox-orders:
                      - role
                      - content
              required:
                - model
                - input
              x-apifox-orders:
                - model
                - input
            example:
              model: gpt-4.1
              input:
                - role: user
                  content: Write a one-sentence bedtime story about a unicorn.
      responses:
        '200':
          description: ''
          content:
            application/json:
              schema:
                type: object
                properties: {}
          headers: {}
          x-apifox-name: 成功
      security: []
      x-apifox-folder: 聊天(Responses)
      x-apifox-status: released
      x-run-in-apifox: https://app.apifox.com/web/project/3868318/apis/api-321434971-run
components:
  schemas: {}
  securitySchemes: {}
servers: []
security: []

```


# 创建模型响应(流式返回)

## OpenAPI Specification

```yaml
openapi: 3.0.1
info:
  title: ''
  description: ''
  version: 1.0.0
paths:
  /v1/responses:
    post:
      summary: 创建模型响应(流式返回)
      deprecated: false
      description: |
        https://platform.openai.com/docs/api-reference/responses/create

        部分OpenAI模型仅支持Response格式，例如o3-pro，codex-mini-latest
      tags:
        - 聊天(Responses)
      parameters:
        - name: Authorization
          in: header
          description: ''
          required: false
          example: Bearer {{YOUR_API_KEY}}
          schema:
            type: string
            default: Bearer {{YOUR_API_KEY}}
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                model:
                  type: string
                stream:
                  type: boolean
                input:
                  type: array
                  items:
                    type: object
                    properties:
                      role:
                        type: string
                      content:
                        type: string
                    x-apifox-orders:
                      - role
                      - content
              required:
                - model
                - stream
                - input
              x-apifox-orders:
                - model
                - stream
                - input
            example:
              model: gpt-4.1
              stream: true
              input:
                - role: user
                  content: Write a one-sentence bedtime story about a unicorn.
      responses:
        '200':
          description: ''
          content:
            application/json:
              schema:
                type: object
                properties: {}
          headers: {}
          x-apifox-name: 成功
      security: []
      x-apifox-folder: 聊天(Responses)
      x-apifox-status: released
      x-run-in-apifox: https://app.apifox.com/web/project/3868318/apis/api-321436991-run
components:
  schemas: {}
  securitySchemes: {}
servers: []
security: []

```

# 创建模型响应（调用联网

## OpenAPI Specification

```yaml
openapi: 3.0.1
info:
  title: ''
  description: ''
  version: 1.0.0
paths:
  /v1/responses:
    post:
      summary: 创建模型响应（调用联网
      deprecated: false
      description: |
        https://platform.openai.com/docs/api-reference/responses/create

        部分OpenAI模型仅支持Response格式，例如o3-pro，codex-mini-latest
      tags:
        - 聊天(Responses)
      parameters:
        - name: Authorization
          in: header
          description: ''
          required: false
          example: Bearer {{YOUR_API_KEY}}
          schema:
            type: string
            default: Bearer {{YOUR_API_KEY}}
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                model:
                  type: string
                input:
                  type: array
                  items:
                    type: object
                    properties:
                      role:
                        type: string
                      content:
                        type: string
                    x-apifox-orders:
                      - role
                      - content
              required:
                - model
                - input
              x-apifox-orders:
                - model
                - input
            example:
              model: o3-deep-research-2025-06-26
              input:
                - role: user
                  content: hi
              tools:
                - type: web_search_preview
      responses:
        '200':
          description: ''
          content:
            application/json:
              schema:
                type: object
                properties: {}
          headers: {}
          x-apifox-name: 成功
      security: []
      x-apifox-folder: 聊天(Responses)
      x-apifox-status: released
      x-run-in-apifox: https://app.apifox.com/web/project/3868318/apis/api-322273221-run
components:
  schemas: {}
  securitySchemes: {}
servers: []
security: []

```